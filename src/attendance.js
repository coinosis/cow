import React, { useCallback, useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  Web3Context,
  AccountContext,
  BackendContext,
} from './coinosis';
import { ContractContext, userStates } from './event';
import Amount from './amount';
import {
  environment,
  Loading,
  useConversions,
  sleep,
} from './helpers';
import settings from '../settings.json';
import Account from './account';
import userIcon from './assets/user.png';
import loadingIcon from './assets/loading.gif';
import passIcon from './assets/pass.png';
import failIcon from './assets/fail.png';
import arrowIcon from './assets/arrow.png';
import payuIcon from './assets/payu.png';
import coinosisIcon from './assets/coinosis.png';
import contractIcon from './assets/contract.png';
import { useT } from './i18n';

const transactionStates = {
  SUBMITTED: 'SUBMITTED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED',
};

const paymentModes = {
  ETHER: 1,
  PAYU: 2,
};

const txTypes = {
  REGISTER: 1,
  PULL: 2,
  PUSH: 3,
  REGISTER_FOR: 4,
};

const Attendance = ({
  eventName,
  event,
  fee,
  feeWei,
  userState,
  contractAddress,
  currency,
}) => {

  const { contract } = useContext(ContractContext);
  const web3 = useContext(Web3Context);
  const { account, name: user } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [feeUSDWei, setFeeUSDWei] = useState();
  const { toUSD } = useConversions();
  const [paymentMode, setPaymentMode] = useState();
  const [paymentModePreview, setPaymentModePreview] = useState();
  const [pullPayments, setPullPayments] = useState();
  const [pullState, setPullState] = useState();
  const [pushPayments, setPushPayments] = useState();
  const [pushState, setPushState] = useState();
  const [registerForTxs, setRegisterForTxs] = useState();
  const [registerForState, setRegisterForState] = useState();
  const [registerTxs, setRegisterTxs] = useState();
  const [registerState, setRegisterState] = useState();
  const [txType, setTxType] = useState();

  const fetchTransaction = useCallback(async () => {
    if (!backendURL || !event || !account) return;
    const response = await fetch(`${backendURL}/tx/${event}/${account}`);
    if (!response.ok) {
      throw new Error(response.status);
    }
    const transaction = await response.json();
    if (!transaction) {
      setPullPayments();
      setPushPayments();
      setRegisterForTxs();
      return;
    }
    if (transaction.pull) {
      setPullPayments(prev => {
        if (prev && prev.length === transaction.pull.length) {
          const prevAccount = prev[0].referenceCode.split(':')[1];
          const prevState = prev[prev.length - 1].state;
          if (
            prevAccount === account
              && prevState !== transactionStates.PENDING
              && prevState !== transactionStates.SUBMITTED
          ) {
            return prev;
          }
        }
        return transaction.pull;
      });
    }
    if (transaction.push) {
      setPushPayments(prev => {
        if (prev && prev.length === transaction.push.length) return prev;
        return transaction.push;
      });
    }
    if (transaction.register) {
      setRegisterForTxs(prev => {
        if (
          prev
            && prev.length === transaction.register.length
            && prev[prev.length - 1].state !== transactionStates.PENDING
        ) return prev;
        return transaction.register;
      });
    }
  }, [
    backendURL,
    event,
    account,
    setPullPayments,
    setPushPayments,
    setRegisterTxs,
  ]);

  useEffect(() => {
    fetchTransaction();
    if (pullPayments) {
      setPaymentMode(paymentModes.PAYU);
    }
  }, [ fetchTransaction, pullPayments ]);

  const setTransactionFetcher = useCallback(() => {
    fetchTransaction();
    const transactionInterval = setInterval(fetchTransaction, 3000);
    return () => {
      clearInterval(transactionInterval);
    };
  }, [ fetchTransaction ]);

  useEffect(() => {
    if (!pullPayments) return;
    setPullState(prev => {
      const { state } = pullPayments[pullPayments.length - 1];
      if (state === prev) return prev;
      if (state === transactionStates.APPROVED) {
        setPushState(transactionStates.PENDING);
      }
      return state;
    });
  }, [ pullPayments ]);

  useEffect(() => {
    if (!pushPayments) return;
    setPushState(prev => {
      const { state } = pushPayments[pushPayments.length - 1];
      if (state === prev) return prev;
      if (state === transactionStates.APPROVED) {
        setRegisterForState(transactionStates.PENDING);
      }
      return state;
    });
  }, [ pushPayments ]);

  useEffect(() => {
    if (!registerForTxs) return;
    setRegisterForState(registerForTxs[registerForTxs.length - 1].state);
  }, [ registerForTxs ]);

  useEffect(() => {
    if (!registerTxs) return;
    setRegisterState(registerTxs[registerTxs.length - 1].state);
  }, [ registerTxs ]);

  useEffect(() => {
    if (fee === undefined) return;
    const feeUSDWei = web3.utils.toWei(String(fee));
    setFeeUSDWei(feeUSDWei);
  }, [ fee ]);

  useEffect(() => {
    if (account === undefined) return;
    setPaymentMode(pullPayments && pullPayments.length && paymentModes.PAYU);
    setRegisterForState();
    setRegisterState();
  }, [
    account,
    setPaymentMode,
    pullPayments,
    setTxType,
    setRegisterForState,
    setRegisterState,
  ]);

  const formSubmit = useCallback((url, object) => {
    const form = document.createElement('form');
    form.setAttribute('method', 'post');
    form.setAttribute('action', url);
    for (const key in object) {
      const input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', key);
      input.setAttribute('value', object[key]);
      form.appendChild(input);
    }
    const formWindow = window.open();
    formWindow.document.body.appendChild(form);
    formWindow.document.forms[0].submit();
    return formWindow;
  }, []);

  const awaitClosable = useCallback(async (formWindow, referenceCode) => {
    await sleep(20000);
    do {
      await sleep(1000);
      const response = await fetch(`${backendURL}/closable/${referenceCode}`);
      const closable = await response.json();
      if (closable == true) {
        formWindow.close();
        break;
      }
    } while (true);
  }, [ backendURL ]);

  const payU = useCallback(() => {
    const payUGateway = settings[environment].payU.gateway;
    const environmentId = settings[environment].id
    const counter = pullPayments ? pullPayments.length : 0;
    const referenceCode = `${event}:${account}:${counter}:${environmentId}`;
    const fee = Number(web3.utils.fromWei(feeWei)).toFixed(2);
    const test = settings[environment].payU.test;
    const callback = process.env.CALLBACK || backendURL;
    const object = {
      merchantId: settings[environment].payU.merchantId,
      referenceCode,
      description: eventName,
      amount: fee,
      tax: 0,
      taxReturnBase: 0,
      accountId: settings[environment].payU.accountId,
      currency: 'USD',
      buyerFullName: user,
      buyerEmail: '',
      algorithmSignature: 'SHA256',
      confirmationUrl: `${callback}/payu`,
      responseUrl: `${callback}/close`,
      test,
    };
    fetch(
      `${backendURL}/payu/hash`,
      {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceCode: object.referenceCode,
          amount: object.amount,
          currency: object.currency,
        }),
      }
    ).then(response => {
      if (!response.ok) {
        throw new Error(response.status);
      }
      return response.json();
    }).then(hash => {
      object.signature = hash;
      const formWindow = formSubmit(payUGateway, object);
      setTransactionFetcher();
      awaitClosable(formWindow, referenceCode);
    }).catch(err => {
      console.error(err);
    });
  }, [
    web3,
    eventName,
    event,
    feeWei,
    account,
    user,
    backendURL,
    toUSD,
    awaitClosable,
    formSubmit,
    pullPayments,
  ]);

  const attend = useCallback(() => {
    setPaymentMode(paymentModes.PAYU);
    setPullState(transactionStates.PENDING);
    setTxType();
    payU();
  }, [ setPaymentMode, setPullState, setTxType, payU ]);

  const sendEther = useCallback(async () => {
    setPaymentMode(paymentModes.ETHER);
    setTxType();
    setRegisterTxs(prev => {
      const next = [];
      if(prev) {
        next.push(...prev);
      }
      next.push({
        amount: web3.utils.fromWei(feeWei),
        currency: 'xDAI',
        date: new Date().toISOString(),
        state: transactionStates.PENDING,
      });
      return next;
    });
    const txOptions = {
      from: account,
      value: feeWei,
      gas: 200000,
      gasPrice: '1000000000',
    };
    contract.methods.register().send(txOptions)
      .on('error', error => {
        setRegisterTxs(prev => {
          const next = [ ...prev ];
          const last = next.length - 1;
          next[last].state = transactionStates.REJECTED;
          next[last].message = error.message;
          return next;
        });
      }).on('transactionHash', txHash => {
        setRegisterTxs(prev => {
          const next = [ ...prev ];
          const last = next.length - 1;
          next[last].txHash = txHash;
          return next;
        });
      }).on('receipt', () => {
        setRegisterTxs(prev => {
          const next = [ ...prev ];
          const last = next.length - 1;
          next[last].state = transactionStates.APPROVED;
          return next;
        });
      });
  }, [ contract, account, feeWei ]);

  if (account === null) {
    return (
      <div
        css={`
          display: flex;
          justify-content: center;
        `}
      >
        <Account />
      </div>
    );
  }

  if (user === undefined) return <Loading/>

  if (user === null) {
    return <Account/>
  }

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      <PaymentOptions
        feeUSDWei={feeUSDWei}
        feeWei={feeWei}
        sendEther={sendEther}
        attend={attend}
        setPaymentMode={setPaymentModePreview}
        userState={userState}
        registerForState={registerForState}
        registerState={registerState}
        currency={currency}
      />
      <PaymentProcess
        paymentMode={paymentMode}
        paymentModePreview={paymentModePreview}
        registerState={registerState}
        pullState={pullState}
        pushState={pushState}
        registerForState={registerForState}
        txType={txType}
        setTxType={setTxType}
      />
      <PaymentInfo
        txType={txType}
        pullPayments={pullPayments}
        pushPayments={pushPayments}
        registerForTxs={registerForTxs}
        registerTxs={registerTxs}
        userName={user}
        contractAddress={contractAddress}
        paymentModePreview={paymentModePreview}
      />
    </div>
  );
}

const PaymentInfo = ({
  txType,
  pullPayments,
  pushPayments,
  registerForTxs,
  registerTxs,
  userName,
  contractAddress,
  paymentModePreview,
}) => {

  const [tx, setTx] = useState();
  const [from, setFrom] = useState();
  const [to, setTo] = useState();
  const t = useT();

  useEffect(() => {
    if (!txType) {
      setTx(null);
    }
    else if (txType === txTypes.PULL) {
      setFrom(userName);
      setTo(t('payu'));
      if (pullPayments && pullPayments.length) {
        setTx(pullPayments[pullPayments.length - 1]);
      } else {
        setTx({});
      }
    } else if (txType === txTypes.PUSH) {
      setFrom(t('payu'));
      setTo(t('coinosis'));
      if (pushPayments && pushPayments.length) {
        setTx(pushPayments[pushPayments.length - 1]);
      } else {
        setTx({});
      }
    } else if (txType === txTypes.REGISTER_FOR) {
      setFrom(`${t('coinosis')} (${t('on_behalf_of')} ${userName})`);
      setTo(`$t('contract')} ${contractAddress}`);
      if (registerForTxs && registerForTxs.length) {
        setTx(registerForTxs[registerForTxs.length - 1]);
      } else {
        setTx({});
      }
    } else if (txType === txTypes.REGISTER) {
      setFrom(userName);
      setTo(`${t('contract')} ${contractAddress}`);
      if (registerTxs && registerTxs.length) {
        setTx(registerTxs[registerTxs.length - 1]);
      } else {
        setTx({});
      }
    }
  }, [
    txType,
    pullPayments,
    pushPayments,
    registerForTxs,
    registerTxs,
    userName,
    contractAddress,
  ]);

  if (!tx || paymentModePreview) return null;

  return (
    <Table>
      <Field name={t('transaction')}>
        {tx.txHash || tx.referenceCode}
      </Field>
      <Field name={t('date')}>
        {tx.date}
      </Field>
      <Field name={t('source')}>
        {from}
      </Field>
      <Field name={t('destination')}>
        {to}
      </Field>
      <Field name={t('amount')}>
        {tx.amount}
      </Field>
      <Field name={t('currency')}>
        {tx.currency}
      </Field>
      <Field name={t('payment_method')}>
        {tx.method}
      </Field>
      <Field name={t('status')}>
        {tx.state}
      </Field>
      <Field name={t('message')}>
        {tx.message}
      </Field>
      <Field name={t('receipt')}>
        {tx.receipt}
      </Field>
    </Table>
  );
}

const Table = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid black;
  border-radius: 5px;
  padding: 0 10px;
  margin-top: 30px;
  max-width: 90%;
`

const Field = ({ name, children }) => {
  if (!children) return null;
  return (
    <Row>
      <Name>{name}:</Name>
      <Value>{children}</Value>
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  border-bottom: 1px solid #0e8f00;
  padding: 10px;
  &:last-of-type {
    border: none;
}
`

const Name = styled.div`
  display: flex;
  min-width: 150px;
`

const Value = styled.div`
  display: flex;
  word-break: break-all;
`

const PaymentProcess = ({
  paymentMode,
  paymentModePreview,
  registerState,
  pullState,
  pushState,
  registerForState,
  txType,
  setTxType,
}) => {

  if (!paymentMode && !paymentModePreview) return null;

  return (
    <div
      css={`
        display: flex;
        align-items: center;
        flex-wrap: wrap;
      `}
    >
      <img src={userIcon} width="150" />
      <TransactionIcon
        setTxType={setTxType}
        id={
          paymentMode === paymentModes.ETHER
            ? txTypes.REGISTER
            : txTypes.PULL
        }
        selected={
          paymentModePreview
            ? false
            : paymentMode === paymentModes.ETHER
            ? txType === txTypes.REGISTER
            : txType === txTypes.PULL
        }
        state={
          paymentModePreview
            ? ''
            : paymentMode === paymentModes.ETHER
            ? registerState
            : paymentMode === paymentModes.PAYU
            ? pullState
            : ''
        }
      />
      { (
        paymentModePreview === paymentModes.PAYU
          || (paymentMode === paymentModes.PAYU && !paymentModePreview)
      ) && (
        <>
          <img src={payuIcon} width="150" />
          <TransactionIcon
            setTxType={setTxType}
            id={txTypes.PUSH}
            selected={paymentModePreview ? false : txType === txTypes.PUSH}
            state={paymentModePreview ? '' : pushState}
          />
          <img src={coinosisIcon} width="150" />
          <TransactionIcon
            setTxType={setTxType}
            id={txTypes.REGISTER_FOR}
            selected={
              paymentModePreview
                ? false
                : txType === txTypes.REGISTER_FOR
            }
            state={paymentModePreview ? '' : registerForState}
          />
        </>
      ) }
      <img src={contractIcon} width="150" />
    </div>
  );
}

const TransactionIcon = ({ state, setTxType, id, selected }) => {
  const icon = state === transactionStates.PENDING
        || state === transactionStates.SUBMITTED
        ? loadingIcon
        : state === transactionStates.APPROVED
        ? passIcon
        : state === transactionStates.REJECTED
        || state === transactionStates.DECLINED
        || state === transactionStates.EXPIRED
        ? failIcon
        : '';
  return (
    <div
      css={`
        width: 141px;
        height: 80px;
        margin: 0 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        background: ${selected ? '#d0dfd0': 'initial'};
        &:hover {
          background: #d0dfd0;
        };
        border-radius: 5px;
      `}
      onClick={() => { setTxType(id) }}
    >
      <img
        src={arrowIcon}
        css={`
          position: absolute;
          width: 100px;
        `}
      />
      <img
        src={icon}
        css={`
          position: absolute;
          width: 40px;
        `}
      />
    </div>
  );
}

const PaymentOptions = ({
  feeUSDWei,
  feeWei,
  sendEther,
  attend,
  setPaymentMode,
  userState,
  registerForState,
  registerState,
  currency,
}) => {

  const t = useT();

  if (
    userState >= userStates.REGISTERED
      || registerForState === transactionStates.APPROVED
      || registerState === transactionStates.APPROVED
  ) {
    return (
      <div
        css={`
          display: flex;
          margin-bottom: 40px;
          flex-direction: column;
          align-items: center;
        `}
      >
        <div
          css={`
            font-size: 20px;
          `}
        >
          {t('signed_up_successfully')}
        </div>
        { userState < userStates.REGISTERED && (
          <div>
            {t('waiting_for_tx_in_contract')}

          </div>
        )}
      </div>
    );
  }

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      <div
        css={`
          display: flex;
        `}
      >
        <div>
          {t('make_deposit_of')}
        </div>
        <div
          css={`
            margin: 0 5px 10px;
          `}
        >
          <Amount
            usd={feeUSDWei}
            eth={feeWei}
            rate={1e18}
            currency={currency}
          />
        </div>
        <div>
          {t('to_participate')}.
        </div>
      </div>
      <div
        css={`
          display: flex;
          width: 50%;
          justify-content: space-around;
        `}
      >
        <button
          onMouseOver={() => { setPaymentMode(paymentModes.ETHER) }}
          onMouseOut={() => { setPaymentMode() }}
          onClick={sendEther}
        >
          {t('send_xdai')}
        </button>
        <button
          onMouseOver={() => { setPaymentMode(paymentModes.PAYU) }}
          onMouseOut={() => { setPaymentMode() }}
          onClick={attend}
        >
          {t('send_fiat')}
        </button>
      </div>
      <div css="margin: 10px">
        {t('deposit_explanation')}
      </div>
    </div>
  );
}

export default Attendance;
