import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Web3Context,
  AccountContext,
  BackendContext,
} from './coinosis';
import { ContractContext } from './event';
import Amount from './amount';
import {
  EtherscanLink,
  environment,
  formatDate,
  Loading,
  SectionTitle,
  useGasPrice,
  usePost,
  useConversions,
  sleep,
} from './helpers';
import settings from '../settings.json';
import Account from './account';

const Attendance = ({
  eventName,
  event,
  fee,
  feeWei,
  attendees,
  getAttendees,
  end,
  updateState,
}) => {

  const { contract } = useContext(ContractContext);
  const getGasPrice = useGasPrice();
  const web3 = useContext(Web3Context);
  const { account, name: user } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const post = usePost();
  const [feeUSDWei, setFeeUSDWei] = useState();
  const [now] = useState(new Date());
  const [paymentList, setPaymentList] = useState();
  const [approved, setApproved] = useState();
  const [pending, setPending] = useState();
  const [ethState, setEthState] = useState();
  const [ethMessage, setEthMessage] = useState();
  const [txHash, setTxHash] = useState();
  const { toUSD } = useConversions();

  const fetchPayments = useCallback(() => {
    fetch(`${backendURL}/payu/${event}/${account}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        } else {
          return response.json();
        }
      }).then(data => {
        setApproved(data.some(d => d.pull && d.pull.status === 'APPROVED'));
        setPending(data.length
          && data[0].pull
          && data[0].pull.status === 'PENDING'
        );
        setPaymentList(data);
        const payment = data.find(d => d.transaction && d.transaction.hash);
        if (payment !== undefined) {
          setTxHash(payment.transaction.hash);
        }
       }).catch(err => {
        console.error(err);
       });
  }, [ backendURL, event, account ]);

  useEffect(() => {
    if (!backendURL || !event || !account) return;
    fetchPayments();
    const paymentsFetcher = setInterval(fetchPayments, 10000);
    return () => {
      clearInterval(paymentsFetcher);
    };
  }, [ backendURL, event, account ]);

  useEffect(() => {
    if (fee === undefined) return;
    const feeUSDWei = web3.utils.toWei(String(fee));
    setFeeUSDWei(feeUSDWei);
  }, [fee]);

  useEffect(() => {
    setEthState();
  }, [ account ]);

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
      await sleep(2000);
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
    const counter = paymentList.length + 1;
    const referenceCode = `${event}:${account}:${counter}:${environmentId}`;
    const fee = Math.round(toUSD(web3.utils.fromWei(feeWei)) * 100) / 100;
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
    paymentList,
    backendURL,
    toUSD,
    awaitClosable,
    formSubmit,
  ]);

  const attendFree = useCallback(() => {
    const object = { attendee: account, event };
    post('attend', object, err => {
      if (err) {
        console.error(err);
      }
    });
  }, [event, account]);

  const attend = () => {
    if (fee == 0) {
      attendFree();
    }
    else {
      payU();
    }
  }

  const sendEther = useCallback(async () => {
    const gasPrice = await getGasPrice();
    const txOptions = {
      from: account,
      value: feeWei,
      gasPrice: gasPrice.propose,
      gas: 200000,
    };
    contract.methods.register().send(txOptions)
      .on('transactionHash', hash => {
        setTxHash(hash);
        setEthState('transaction created');
        setEthMessage('waiting to be included in the blockchain...');
      }).on('receipt', () => {
        setEthState('accepted transaction');
        setEthMessage('registering your payment...');
        getAttendees();
        updateState();
      });
  }, [ contract, account, getGasPrice, feeWei, updateState ]);

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
      <div
        css={`
            display: flex;
          `}
      >
        <div>
          make a deposit of
        </div>
        <div
          css={`
            margin: 0 5px 10px;
          `}
        >
          <Amount usd={feeUSDWei} eth={feeWei} />
        </div>
        <div>
          to participate.
        </div>
      </div>
      { attendees.includes(account) ? (
        <div
          css={`
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        >
        <SectionTitle>
          you successfully signed up
        </SectionTitle>
        </div>
      ) : paymentList === undefined ? (
        <Loading/>
      ) : now > end ? (
        <div>This event finished on {formatDate(end)}</div>
      ) : (
        <div
          css={`
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
        >
          { !paymentList.length && !ethState ? (
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
                  width: 50%;
                  justify-content: space-around;
                `}
              >
                <button
                  onClick={sendEther}
                >
                  send ether
                </button>
                <button
                  onClick={attend}
                >
                  use credit card
                </button>
              </div>
              <div css="margin: 10px">
                the deposited money will be distributed among the attendees
                according to the claps received.
              </div>
            </div>
          ) : approved ? (
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <SectionTitle>
                your payment was accepted
              </SectionTitle>
              { txHash ? (
                <EtherscanLink type="tx" value={txHash} >
                  sending transaction to smart contract...
                </EtherscanLink>
              ) : (
                <div>waiting confirmation from PayU...</div>
              ) }
            </div>
          ) : ethState ? (
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <SectionTitle>
                { ethState }
              </SectionTitle>
              { txHash ? (
                <EtherscanLink type="tx" value={txHash}>
                  { ethMessage }
                </EtherscanLink>
              ) : ethMessage }
            </div>
          ) : pending ? (
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <SectionTitle>
                cash payments are disabled
              </SectionTitle>
              please use another payment method
              <button onClick={attend}>
                use credit card
              </button>
              <button
                onClick={sendEther}
              >
                send ether
              </button>
            </div>
          ) : (
            <div
              css={`
                display: flex;
                flex-direction: column;
                align-items: center;
              `}
            >
              <SectionTitle>
                your payment was rejected
              </SectionTitle>
              <button
                onClick={attend}
              >
                try again
              </button>
              <button
                onClick={sendEther}
              >
                send ether
              </button>
            </div>
          )}
        </div>
      )}
      { !!paymentList && !!paymentList.length && (
        <div>
          <table
            css={`
                border-collapse: collapse;
                td {
                  border: 1px solid black;
                  padding: 10px;
                };
              `}
          >
            <caption>
              <SectionTitle>
                transaction history
              </SectionTitle>
            </caption>
            <thead>
              <tr>
                <th>date</th>
                <th>amount</th>
                <th>result</th>
                <th>reference</th>
              </tr>
            </thead>
            <tbody>
              { paymentList.map(payment => {
                const { pull } = payment;
                if (pull === null) return (
                  <tr><td>Trying to connect with PayU...</td></tr>
                );
                return (
                  <tr key={payment.referenceCode}>
                    <td>{formatDate(new Date(pull.requestDate))}</td>
                    <td>{pull.value} {pull.currency}</td>
                    <td>{pull.response}</td>
                    <td>{payment.referenceCode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Attendance;
