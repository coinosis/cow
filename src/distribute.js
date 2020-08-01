import React, { useCallback, useContext, useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import { en } from 'date-fns/esm/locale';
import {
  useGasPrice,
  ATTENDEE_CLICKED_DISTRIBUTE,
  ATTENDEE_SENT_DISTRIBUTION,
} from './helpers';
import Amount from './amount';
import { BackendContext, AccountContext } from './coinosis';
import { ContractContext, userStates } from './event';

const Distribute = ({ eventURL, end, state, updateState, reward }) => {

  const { contract } = useContext(ContractContext);
  const backendURL = useContext(BackendContext);
  const { account } = useContext(AccountContext);
  const [disabled, setDisabled] = useState(true);
  const [message, setMessage] = useState();
  const [time, setTime] = useState();
  const [updater, setUpdater] = useState();
  const [distributed, setDistributed] = useState(false);
  const [txState, setTxState] = useState(state);
  const getGasPrice = useGasPrice();

  const updateTime = useCallback(() => {
    setTime(new Date());
  }, []);

  useEffect(() => {
    updateTime();
    const timeUpdater = setInterval(updateTime, 10000);
    setUpdater(timeUpdater);
    return () => {
      clearInterval(timeUpdater);
    }
  }, [ updateTime ]);

  useEffect(() => {
    const getPastEvents = async () => {
      const pastEvents = await contract.getPastEvents(
        'Distribution',
        {fromBlock: 0}
      );
      if (pastEvents.length > 0) {
        setDistributed(true);
        setMessage('Distribution made. Thanks for joining in!');
        clearInterval(updater);
      }
    }
    getPastEvents();
  }, [ time, contract, updater ]);

  useEffect(() => {
    if (time === undefined || end === undefined) return;
    if (txState >= ATTENDEE_CLICKED_DISTRIBUTE) return;
    if (time >= end) {
      setMessage('Before you distribute the funds, '
                 + 'make sure everyone has sent their claps.');
      setDisabled(false);
    } else {
      const dateOptions = { locale: en, addSuffix: true, includeSeconds: true };
      const distance = formatDistance(end, time, dateOptions);
      setMessage(`the distribution of funds will be enabled ${distance}.`);
    }
  }, [ time, end, updater ]);

  const distribute = useCallback(() => {
    setTxState(ATTENDEE_CLICKED_DISTRIBUTE);
    setMessage('preparing transaction...');
    setDisabled(true);
    const gasPrice = getGasPrice();
    const sendOptions = {
      from: account,
      gasPrice: gasPrice.propose,
      gas: 900000,
    }
    setMessage('use Metamask to send the transaction.');
    contract.methods.distribute().send(sendOptions)
      .on('error', error => {
        setTxState(state);
        setMessage(error.message.substring(0, 60));
        setDisabled(false);
      }).on('transactionHash', () => {
        setMessage('waiting for the transaction to be included in the '
                   + 'blockchain...');
      }).on('receipt', () => {
        setTxState(ATTENDEE_SENT_DISTRIBUTION);
        updateState();
        fetch(`${backendURL}/distribution/${eventURL}`, { method: 'put' });
      });
  }, [ backendURL, eventURL, contract, account, getGasPrice ]);

  return (
    <div
      css={`
        max-width: 250px;
        margin: 40px 10px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 10px;
        background: ${time < end
                        ? '#d0d0d0'
                        : state < userStates.REWARDED
                        ? '#a0d0a0'
                        : '#a0a0d0'
                     };
        border: 1px solid black;
      `}
    >
      <div
        css={`
          width: 100%;
          display: flex;
          justify-content: center;
        `}
      >
        {message}
      </div>
      { !distributed && (
        <div
          css={`
            width: 100%;
            display: flex;
            justify-content: center;
          `}
        >
          <button
            disabled={disabled}
            onClick={distribute}
            css="margin: 10px 0"
          >
            distribute funds to everyone!
          </button>
        </div>
      )}
      {time >= end && !distributed && (
        <div
          css={`
            width: 100%;
            display: flex;
            align-items: center;
          `}
        >
          this action:
          <ul>
            <li>only one person has to do it,</li>
            <li>any assistant can do it,</li>
            <li>and it has cost.</li>
          </ul>
        </div>
      )}
      { state == userStates.REWARDED && (
        <div
          css={`
            width: 100%;
            display: flex;
            justify-content: center;
          `}
        >
          <div css="margin-right: 10px">
            you received
          </div>
          <Amount eth={reward}/>
        </div>
      )}
    </div>
  );
}

export default Distribute;
