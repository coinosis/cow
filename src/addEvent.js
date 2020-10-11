import React, { useContext, useEffect, useCallback, useState } from 'react';
import { Input } from 'rimble-ui';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import {
  addMinutes,
  subMinutes
} from 'date-fns';
import abi from '../contracts/ProxyEvent.abi.json';
import bin from '../contracts/ProxyEvent.bin.txt';
import { Web3Context, AccountContext } from './coinosis';
import {
  environment,
  usePost,
  timestampInSeconds,
  dateFromTimestamp,
} from './helpers';
import settings from '../settings.json';
import { useT, useLocale, useDateFormat, } from './i18n';
import testDescription from './assets/testDescription.txt';
import { entityTypes } from './entity';

const AddEvent = ({ eventType, setEvents, setSeries, events, series, }) => {

  const post = usePost();
  const web3 = useContext(Web3Context);
  const { account, name: userName } = useContext(AccountContext);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [ presentation, setPresentation ] = useState('');
  const [feeETH, setFeeETH] = useState('');
  const [fee, setFee] = useState('');
  const [ noDeposit, setNoDeposit, ] = useState('');
  const [now] = useState(new Date());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [minutesBefore, setMinutesBefore] = useState(
    settings[environment].addEvent.before
  );
  const [minutesAfter, setMinutesAfter] = useState(
    settings[environment].addEvent.after
  );
  const [formValid, setFormValid] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState();
  const [ selectedEvents, setSelectedEvents, ] = useState([]);
  const t = useT();
  const locale = useLocale();

  const setNoDepositRaw = useCallback(next => {
    setNoDeposit(next);
    if (next) {
      setFee('');
      setFeeETH('');
    }
  }, [ setNoDeposit, setFee, setFeeETH, ]);

  useEffect(() => {
    registerLocale('es', locale);
  }, [ locale ]);

  useEffect(() => {
    if (!settings[environment].addEvent.prepopulate) return;
    const seed = Math.random();
    const eventName = eventType === entityTypes.EVENT ? 'event' : 'series';
    preSetName({ target: { value: `${eventName} ${seed}` } });
    setDescription(testDescription);
    setFeeETH(`${(seed * 10).toFixed(3)}`);
    setFee(`${(seed * 10).toFixed(2)}`);
    const { minutesFromNow } = settings[environment].addEvent.prepopulate;
    preSetStart(addMinutes(new Date(), minutesFromNow));
  }, [ settings, environment, eventType, ]);

  useEffect(() => {
    const commonValid =
          name !== ''
          && url !== ''
          && description !== ''
          && userName !== null;
    if (eventType === entityTypes.EVENT) {
      const valid =
            commonValid
            && ( (Number(feeETH) != 0 && Number(fee) != 0) || noDeposit )
            && start !== ''
            && end !== '';
      setFormValid(valid);
    } else if (eventType === entityTypes.SERIES) {
      const valid = commonValid && selectedEvents.length;
      setFormValid(valid);
    }
  }, [
    eventType,
    name,
    url,
    description,
    feeETH,
    fee,
    noDeposit,
    start,
    end,
    userName,
    selectedEvents,
  ]);

  const preSetName = useCallback(e => {
    const value = e.target.value;
    setName(value);
    setUrl(value
           .toLowerCase()
           .replace(/ /g, '-')
           .replace(/á/g, 'a')
           .replace(/é/g, 'e')
           .replace(/í/g, 'i')
           .replace(/ó/g, 'o')
           .replace(/ú/g, 'u')
           .replace(/ñ/g, 'n')
           .replace(/ü/g, 'u')
           .replace(/[^a-z0-9-]/g, '')
           .substring(0, 60)
          );
  }, []);

  const preSetUrl = useCallback(e => {
    const value = e.target.value;
    if(/^$|^[a-z1-9-]{1}[a-z0-9-]{0,59}$/.test(value)) {
      setUrl(value);
    }
  }, []);

  const getFee = useCallback((value, decimals) => {
    if (value === '') return value;
    const feeFormat = new RegExp(`^(\\d+\\.?\\d{0,${decimals}}).*`);
    const match = String(value).match(feeFormat);
    if (!match) return null;
    return match[1];
  }, []);

  const setFeeETHRaw = useCallback(({ target: { value }}) => {
    const feeETH = getFee(value, 3);
    if (feeETH === null) return;
    setFeeETH(feeETH);
    const valueUSD = feeETH;
    const fee = getFee(valueUSD, 2);
    setFee(fee);
  }, [ getFee ]);

  const setFeeRaw = useCallback(({ target: { value }}) => {
    const fee = getFee(value, 2);
    if (fee === null) return;
    setFee(fee);
    const valueETH = fee;
    const feeETH = getFee(valueETH, 3);
    setFeeETH(feeETH);
  }, [ getFee ]);

  const preSetStart = useCallback(start => {
    setStart(start);
    setEnd(addMinutes(start, settings[environment].addEvent.duration));
  }, []);

  const makeNatural = useCallback(value => {
    const number = Number(value);
    const positive = Math.abs(number);
    const integer = Math.floor(positive);
    return integer;
  }, []);

  const preSetMinutesBefore = useCallback(e => {
    const { value } = e.target;
    if (value === '') {
      setMinutesBefore(value);
      return;
    }
    if (isNaN(value)) return;
    const natural = makeNatural(value);
    setMinutesBefore(natural);
  });

  const preSetMinutesAfter = useCallback(e => {
    const { value } = e.target;
    if (value === '') {
      setMinutesAfter(value);
      return;
    }
    if (isNaN(value)) return;
    const natural = makeNatural(value);
    setMinutesAfter(natural);
  });

  const addToBackend = useCallback((address, feeWei, end) => {
    const organizer = account;
    const beforeStart = subMinutes(start, minutesBefore);
    const endDate = dateFromTimestamp(end);
    const afterEnd = addMinutes(endDate, minutesAfter);
    const currency = 'xDAI';
    const object = {
      address,
      name,
      url,
      description,
      presentation,
      feeWei,
      currency,
      start,
      end: endDate,
      beforeStart,
      afterEnd,
      organizer,
    };
    setStatus(t('sign_with_metamask'));
    post('events', object, (err, data) => {
      if (err) {
        setStatus(err.message.substring(0, 60));
        setCreating(false);
        return;
      }
      data.startDate = start;
      data.endDate = end;
      setEvents(events => [...events, data]);
      setName('');
      setUrl('');
      setDescription('');
      setPresentation('');
      setFeeETH('');
      setFee('');
      setStart('');
      setEnd('');
      setMinutesBefore(30);
      setMinutesAfter(30);
      setStatus(t('event_created'));
      setCreating(false);
    }, 'post', () => setStatus(t('storing_event_metadata')));
  }, [
    name,
    description,
    presentation,
    start,
    end,
    minutesBefore,
    minutesAfter,
    account,
    t,
  ]);

  const deployContract = useCallback(async () => {
    setCreating(true);
    setStatus(t('event_creation_started'));
    const contract = new web3.eth.Contract(abi);
    const feeWei = web3.utils.toWei(String(feeETH));
    const endTimestamp = timestampInSeconds(end);
    const deployData = {
      data: bin,
      arguments: [feeWei, endTimestamp],
    };
    const deployment = await contract.deploy(deployData);
    setStatus(t('deploy_with_metamask'));
    const txOptions = {
      from: account,
      gas: 850000,
      gasPrice: '1000000000',
    };
    const instance = await deployment.send(txOptions)
          .on('error', error => {
            setStatus(error.message.substring(0, 60));
            setCreating(false);
          }).on('transactionHash', () => {
            setStatus(t('waiting_for_confirmation'));
          });
    const actualFeeWei = await instance.methods.fee().call();
    const actualEnd = await instance.methods.end().call();
    return {
      address: instance._address,
      actualFeeWei,
      actualEnd,
    };
  }, [
    web3,
    abi,
    bin,
    url,
    feeETH,
    account,
    end,
    minutesAfter,
    t,
  ]);

  const addSeries = useCallback(async () => {
    const object = {
      name,
      url,
      description,
      events: selectedEvents,
      organizer: account,
    };
    setStatus(t('sign_with_metamask'));
    post('series', object, (err, data) => {
      if (err) {
        console.log(err);
        return;
      }
      setSeries(prev => [ ...prev, data, ]);
      setName('');
      setUrl('');
      setDescription('');
      setSelectedEvents([]);
      setStatus(t('series_created'));
    }, 'post', () => setStatus(t('storing_series_metadata')));
  }, [ name, url, description, selectedEvents, account, ]);

  const add = useCallback(async () => {
    if (eventType === entityTypes.SERIES) {
      addSeries();
      return;
    }
    if (noDeposit) {
      const endTimestamp = timestampInSeconds(end);
      addToBackend('', 0, endTimestamp);
      return;
    }
    const { address, actualFeeWei, actualEnd, } = await deployContract();
    addToBackend(address, actualFeeWei, actualEnd);
  }, [ eventType, noDeposit, end, addToBackend, deployContract, ]);

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
      `}
    >
      <table
        css={`
          width: 100%;
        `}
      >
        <tbody>
          <Field
            label={`${t('event_name')}:`}
            element={
              <Input
                height='2rem'
                value={name}
                onChange={preSetName}
                css={`
                  width: 500px;
                `}
              />
            }
          />
          <Field
            label={`${t('url')}:`}
            element={
              <div
                css={`
                  font-family: monospace;
                `}
              >
                coinosis.co/
                <Input
                  height='2rem'
                  value={url}
                  onChange={preSetUrl}
                  css={`
                    width: 406px;
                  `}
                />
              </div>
            }
          />
          <Field
            label={`${t('description')}:`}
            element={
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                css={`
                  width: 502px;
                  height: 200px;
                `}
              />
            }
          />
          { eventType === entityTypes.EVENT ? (
            <EventFields
              presentation={presentation}
              setPresentation={setPresentation}
              feeETH={feeETH}
              setFeeETHRaw={setFeeETHRaw}
              noDeposit={noDeposit}
              fee={fee}
              setFeeRaw={setFeeRaw}
              setNoDepositRaw={setNoDepositRaw}
              start={start}
              preSetStart={preSetStart}
              now={now}
              end={end}
              setEnd={setEnd}
              minutesBefore={minutesBefore}
              preSetMinutesBefore={preSetMinutesBefore}
              minutesAfter={minutesAfter}
              preSetMinutesAfter={preSetMinutesAfter}
            />
          ) : (
            <SeriesFields
              events={ events }
              series={ series }
              setSelected={ setSelectedEvents }
            />
          ) }
          <tr>
            <td/>
            <td>
              <button
                disabled={!formValid || creating}
                onClick={add}
              >
                { t('create') }
              </button>
            </td>
          </tr>
          <Field
            label={status ? `${t('status')}:` : ''}
            element={status}
          />
        </tbody>
      </table>
    </div>
  );
}

const EventFields = ({
  presentation,
  setPresentation,
  feeETH,
  setFeeETHRaw,
  noDeposit,
  fee,
  setFeeRaw,
  setNoDepositRaw,
  start,
  preSetStart,
  now,
  end,
  setEnd,
  minutesBefore,
  preSetMinutesBefore,
  minutesAfter,
  preSetMinutesAfter,
}) => {

  const t = useT();

  return (
    <>
      <Field
        label={`${ t('presentation_link') }:`}
        element={
          <Input
            value={ presentation }
            onChange={ elem => setPresentation(elem.target.value) }
            css="width: 500px;"
            placeholder={ t('optional') }
          />
        }
      />
      <Field
        label={`${t('deposit_per_participant')}:`}
        element={
          <div
            css={`
              display: flex;
            `}
          >
            <Input
              value={feeETH}
              onChange={setFeeETHRaw}
              type="text"
              css="width: 60px"
              disabled={ noDeposit }
            />
            <div css="margin-left: 5px">xDAI</div>
            <div css="margin-left: 20px">(</div>
            <Input
              value={fee}
              onChange={setFeeRaw}
              type="text"
              css={`
                margin-left: 5px;
                width: 60px;
              `}
              disabled={ noDeposit }
            />
            <div css="margin-left: 5px">USD )</div>
            <div
              css={`
                margin-left: 15px;
                cursor: pointer;
              `}
              onClick={ () => { setNoDepositRaw(!noDeposit) } }
            >
              <Input
                type="checkbox"
                checked={ noDeposit }
                onChange={ () => { setNoDepositRaw(!noDeposit) } }
                css="cursor: pointer;"
              />
              { t('no_deposit') }
            </div>
          </div>
        }
      />
      <Field
        label={`${t('start_time_and_date')}:`}
        element={
          <DatePicker
            dateFormat={ useDateFormat() }
            selected={start}
            onChange={preSetStart}
            showTimeSelect
            timeCaption={ t('time') }
            timeFormat="h:mm aa"
            timeIntervals={30}
            minDate={now}
            locale="es"
            css="width: 250px;"
          />
        }
      />
      <Field
        label={`${t('end_time_and_date')}:`}
        element={
          <DatePicker
            dateFormat={ useDateFormat() }
            selected={end}
            onChange={setEnd}
            showTimeSelect
            timeCaption="hora"
            timeFormat="h:mm aa"
            timeIntervals={30}
            minDate={start || now}
            locale="es"
            css="width: 250px;"
          />
        }
      />
      <Field
        label={t('start_call')}
        element={
          <Input
            value={minutesBefore}
            onChange={preSetMinutesBefore}
            type="text"
            css={`
                  width: 60px;
                `}
          />
        }
        unit={t('minutes_before')}
      />
      <Field
        label={t('and_end_it')}
        element={
          <Input
            value={minutesAfter}
            onChange={preSetMinutesAfter}
            type="text"
            css={`
              width: 60px;
            `}
          />
        }
        unit={t('minutes_after')}
      />
    </>
  );
}

const SeriesFields = ({ events, series, setSelected, }) => {

  const t = useT();
  const { account } = useContext(AccountContext);
  const [ ownEvents, setOwnEvents, ] = useState([]);

  useEffect(() => {
    const ownEvents = events.filter(event =>
      event.organizer === account
        && new Date() < new Date(event.end)
        && !series.some(aSeries => aSeries.events.includes(event.url))
    );
    setOwnEvents(ownEvents);
  }, [ events, account, series, setOwnEvents, ]);

  const select = elem => {
    if (elem.checked) {
      setSelected(prev => {
        if (prev.includes(elem.id)) {
          return prev;
        } else {
          return [ ...prev, elem.id, ];
        }
      });
    } else {
      setSelected(prev => {
        if (prev.includes(elem.id)) {
          const next = [ ...prev, ];
          return next.filter(url => url !== elem.id);
        } else return prev;
      });
    }
  }

  return (
    <>
      <Field
        label={ t('select_events') + ':' }
        element={
          <div>
            { ownEvents.length ? ownEvents.map(event => (
              <div
                key={ event.url }
                css={`
                  cursor: pointer;
                `}
              >
                <Input
                  type="checkbox"
                  id={ event.url }
                  onChange={ e => select(e.target) }
                  css="cursor: pointer;"
                />
                <span
                  onClick={ e => {
                    const input = e.target.previousSibling;
                    input.checked = !input.checked;
                    select(input)
                  }}
                >
                  { event.name }
                </span>
              </div>
            )) : t('no_own_events') }
          </div>
        }
      />
    </>
  );
}

const Field = ({ label, element, unit }) => {
  return (
    <tr>
      <td
        css={`
          width: 50%;
          max-width: 200px;
          text-align: end;
          vertical-align: top;
        `}
      >
        {label}
      </td>
      <td
        css={`
          width: 50%;
        `}
      >
        {element} {unit}
      </td>
    </tr>
  );
}

export default AddEvent;
