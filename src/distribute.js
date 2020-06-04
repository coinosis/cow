import React, { useCallback, useContext, useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/esm/locale';
import { useGasPrice, ATTENDEE_REWARDED } from './helpers';
import { AccountContext } from './coinosis';

const Distribute = ({ contract, end, state, updateState }) => {

  const { account } = useContext(AccountContext);
  const [disabled, setDisabled] = useState(true);
  const [message, setMessage] = useState();
  const [time, setTime] = useState();
  const [updater, setUpdater] = useState();
  const getGasPrice = useGasPrice();

  useEffect(() => {
    if (state === undefined) return;
    if (state == ATTENDEE_REWARDED) {
      setMessage('distribución efectuada.');
      setDisabled(true);
    }
  }, [ state ]);

  const updateTime = useCallback(() => {
    setTime(new Date());
  }, []);

  useEffect(() => {
    if (state == ATTENDEE_REWARDED) return;
    updateTime();
    const timeUpdater = setInterval(updateTime, 10000);
    setUpdater(timeUpdater);
    return () => {
      clearInterval(timeUpdater);
    }
  }, [ updateTime ]);

  useEffect(() => {
    if (time === undefined || end === undefined) return;
    if (state == ATTENDEE_REWARDED) return;
    if (time >= end) {
      setMessage('antes de distribuir los fondos, asegúrate de que todo el '
                 + 'mundo haya enviado sus aplausos.');
      setDisabled(false);
      clearInterval(updater);
    } else {
      const dateOptions = { locale: es, addSuffix: true, includeSeconds: true };
      const distance = formatDistance(end, time, dateOptions);
      setMessage(`la distribución de los fondos se habilitará ${distance}.`);
    }
  }, [ time, end, updater ]);

  const distribute = useCallback(() => {
    setMessage('preparando transacción...');
    setDisabled(true);
    const gasPrice = getGasPrice();
    const sendOptions = {
      from: account,
      gasPrice: gasPrice.propose,
    }
    setMessage('usa Metamask para enviar la transacción.');
    contract.methods.distribute().send(sendOptions)
      .on('error', error => {
        setMessage(error.message.substring(0, 60));
        setDisabled(false);
      }).on('transactionHash', transactionHash => {
        setMessage('esperando a que la transacción sea incluida en la '
                   + 'blockchain...');
      }).on('receipt', receipt => {
        updateState();
        setDisabled(false);
      });
  }, [ contract, account, getGasPrice ]);

  return (
    <div
      css={`
        max-width: 250px;
        margin: 40px 10px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 10px;
        background: ${disabled ? '#d0d0d0' : '#a0d0a0'};
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
        >
          distribuir fondos para todo el mundo
        </button>
      </div>
      {time >= end && state < ATTENDEE_REWARDED && (
        <div
          css={`
            width: 100%;
            display: flex;
            align-items: center;
          `}
        >
          esta acción:
          <ul>
            <li>sólo la tiene que hacer una persona</li>
            <li>cualquier asistente puede hacerla</li>
            <li>tiene costo</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default Distribute;
