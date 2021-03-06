import React, { useCallback, useContext, useEffect, useState } from 'react';
import { formatDistance } from 'date-fns';
import {
  ATTENDEE_CLICKED_DISTRIBUTE,
  ATTENDEE_SENT_DISTRIBUTION,
} from './helpers';
import Amount from './amount';
import { BackendContext, AccountContext } from './coinosis';
import { ContractContext, userStates } from './event';
import { useT, useLocale } from './i18n';

const Distribute = ({
  eventURL,
  end,
  state,
  updateState,
  reward,
  currency,
}) => {

  const { contract } = useContext(ContractContext);
  const backendURL = useContext(BackendContext);
  const { account } = useContext(AccountContext);
  const [disabled, setDisabled] = useState(true);
  const [message, setMessage] = useState();
  const [time, setTime] = useState();
  const [updater, setUpdater] = useState();
  const [distributed, setDistributed] = useState(false);
  const [txState, setTxState] = useState(state);
  const t = useT();
  const locale = useLocale();

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
        setMessage(t('distribution_made'));
        clearInterval(updater);
      }
    }
    getPastEvents();
  }, [ time, contract, updater ]);

  useEffect(() => {
    if (time === undefined || end === undefined) return;
    if (txState >= ATTENDEE_CLICKED_DISTRIBUTE) return;
    if (time >= end) {
      setMessage(t('distribute_warning'));
      setDisabled(false);
    } else {
      const dateOptions = { locale, addSuffix: true, includeSeconds: true, };
      const distance = formatDistance(end, time, dateOptions);
      setMessage(`${ t('distribution_will_be_available') } ${distance}.`);
    }
  }, [ time, end, updater ]);

  const distribute = useCallback(() => {
    setTxState(ATTENDEE_CLICKED_DISTRIBUTE);
    setMessage(t('preparing_transaction'));
    setDisabled(true);
    const sendOptions = {
      from: account,
      gas: 900000,
      gasPrice: '1000000000',
    }
    setMessage(t('send_distribution'));
    contract.methods.distribute().send(sendOptions)
      .on('error', error => {
        setTxState(state);
        setMessage(error.message.substring(0, 60));
        setDisabled(false);
      }).on('transactionHash', () => {
        setMessage(t('waiting_for_confirmation'));
      }).on('receipt', () => {
        setTxState(ATTENDEE_SENT_DISTRIBUTION);
        updateState();
        fetch(`${backendURL}/distribution/${eventURL}`, { method: 'put' });
      });
  }, [ backendURL, eventURL, contract, account ]);

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
            { t('distribute_funds') }
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
          { t('this_action') }
          <ul>
            <li>{ t('one_person_only') } </li>
            <li>{ t('anybody_can_do_it') } </li>
            <li>{ t('has_cost') } </li>
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
            { t('you_got') }
          </div>
          <Amount eth={reward} currency={currency} />
        </div>
      )}
    </div>
  );
}

export default Distribute;
