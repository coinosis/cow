import React, { useCallback, useContext, useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/esm/locale';
import {
  useGasPrice,
  ATTENDEE_REWARDED,
  ATTENDEE_CLICKED_DISTRIBUTE,
  ATTENDEE_SENT_DISTRIBUTION,
} from './helpers';
import Amount from './amount';
import { BackendContext, AccountContext } from './coinosis';
import { ContractContext } from './event';

const Distribute = ({ eventURL, end, state, updateState }) => {

  const { contract } = useContext(ContractContext);
  const backendURL = useContext(BackendContext);
  const { account } = useContext(AccountContext);
  const [disabled, setDisabled] = useState(true);
  const [message, setMessage] = useState();
  const [time, setTime] = useState();
  const [updater, setUpdater] = useState();
  const [reward, setReward] = useState();
  const [distributed, setDistributed] = useState(false);
  const [txState, setTxState] = useState(state);
  const getGasPrice = useGasPrice();


  const getPastEvents = useCallback(async () => {
    const pastEvents = await contract.getPastEvents(
      'Transfer',
      {filter: {attendee: account}, fromBlock: 0}
    );
    if (pastEvents.length > 0) {
      setTxState(ATTENDEE_REWARDED);
      const reward = pastEvents[0].returnValues.reward;
      setReward(reward);
    }
  }, [ contract, account, setTxState, setReward ]);

  useEffect(() => {
    setInterval(getPastEvents, 10000);
  }, [ getPastEvents ]);

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
        setMessage('Distribución efectuada. Gracias por tu participación!');
        clearInterval(updater);
      }
    }
    getPastEvents();
  }, [ time, contract, updater ]);

  useEffect(() => {
    if (time === undefined || end === undefined) return;
    if (txState >= ATTENDEE_CLICKED_DISTRIBUTE) return;
    if (time >= end) {
      setMessage('antes de distribuir los fondos, asegúrate de que todo el '
                 + 'mundo haya enviado sus aplausos.');
      setDisabled(false);
    } else {
      const dateOptions = { locale: es, addSuffix: true, includeSeconds: true };
      const distance = formatDistance(end, time, dateOptions);
      setMessage(`la distribución de los fondos se habilitará ${distance}.`);
    }
  }, [ time, end, updater ]);

  const distribute = useCallback(() => {
    setTxState(ATTENDEE_CLICKED_DISTRIBUTE);
    setMessage('preparando transacción...');
    setDisabled(true);
    const gasPrice = getGasPrice();
    const sendOptions = {
      from: account,
      gasPrice: gasPrice.propose,
      gas: 900000,
    }
    setMessage('usa Metamask para enviar la transacción.');
    contract.methods.distribute().send(sendOptions)
      .on('error', error => {
        setTxState(state);
        setMessage(error.message.substring(0, 60));
        setDisabled(false);
      }).on('transactionHash', () => {
        setMessage('esperando a que la transacción sea incluida en la '
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
                        : txState < ATTENDEE_REWARDED
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
            distribuir fondos para todo el mundo
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
          esta acción:
          <ul>
            <li>sólo la tiene que hacer una persona,</li>
            <li>cualquier asistente puede hacerla,</li>
            <li>tiene costo</li>
          </ul>
        </div>
      )}
      { txState == ATTENDEE_REWARDED && (
        <div
          css={`
            width: 100%;
            display: flex;
            justify-content: center;
          `}
        >
          <div css="margin-right: 10px">
            recibiste
          </div>
          <Amount eth={reward}/>
        </div>
      )}
    </div>
  );
}

export default Distribute;
