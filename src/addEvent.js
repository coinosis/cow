import React, { useContext, useEffect, useCallback, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/esm/locale';
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

registerLocale('es', es);

const AddEvent = ({ setEvents }) => {

  const post = usePost();
  const web3 = useContext(Web3Context);
  const { account, name: userName } = useContext(AccountContext);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [feeETH, setFeeETH] = useState('');
  const [fee, setFee] = useState('');
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

  useEffect(() => {
    if (!settings[environment].addEvent.prepopulate) return;
    const seed = Math.random();
    preSetName({ target: { value: `test ${seed}` } });
    setDescription('test event');
    setFeeETH(`${(seed / 10).toFixed(3)}`);
    setFee(`${(seed * 100).toFixed(2)}`);
    const { minutesFromNow } = settings[environment].addEvent.prepopulate;
    preSetStart(addMinutes(new Date(), minutesFromNow));
  }, [settings, environment]);

  useEffect(() => {
    const valid =
          name !== ''
          && url !== ''
          && description !== ''
          && Number(feeETH) != 0
          && Number(fee) != 0
          && start !== ''
          && end !== ''
          && userName !== null;
    setFormValid(valid);
    setStatus();
  }, [name, url, description, feeETH, fee, start, end, userName]);

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
      feeWei,
      currency,
      start,
      end: endDate,
      beforeStart,
      afterEnd,
      organizer,
    };
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
      setFeeETH('');
      setFee('');
      setStart('');
      setEnd('');
      setMinutesBefore(30);
      setMinutesAfter(30);
      setStatus('evento creado.');
      setCreating(false);
    });
  }, [
    name,
    description,
    start,
    end,
    minutesBefore,
    minutesAfter,
    account,
  ]);

  const deployContract = useCallback(async () => {
    setCreating(true);
    setStatus('iniciando proceso de creación...');
    const contract = new web3.eth.Contract(abi);
    const feeWei = web3.utils.toWei(String(feeETH));
    const endTimestamp = timestampInSeconds(end);
    const deployData = {
      data: bin,
      arguments: [feeWei, endTimestamp],
    };
    const deployment = await contract.deploy(deployData);
    setStatus('usa Metamask para desplegar el contrato. '
              + 'Esta acción tiene costo.');
    const txOptions = {
      from: account,
      gas: 850000,
      gasPrice: '50000000000',
    };
    const instance = await deployment.send(txOptions)
          .on('error', error => {
            setStatus(error.message.substring(0, 60));
            setCreating(false);
          }).on('transactionHash', () => {
            setStatus(
              'esperando a que la transacción sea incluida en la blockchain...'
            );
          }).on('receipt', () => {
            setStatus('usa Metamask para firmar el contrato.');
          });
    const actualFeeWei = await instance.methods.fee().call();
    const actualEnd = await instance.methods.end().call();
    return {
      address: instance._address,
      feeWei: actualFeeWei,
      end: actualEnd,
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
  ]);

  const add = useCallback(async () => {
    const { address, feeWei, end } = await deployContract();
    addToBackend(address, feeWei, end);
  }, [ addToBackend, deployContract ]);

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
            label="nombre del evento:"
            element={
              <input
                value={name}
                onChange={preSetName}
                css={`
                  width: 500px;
                `}
              />
            }
          />
          <Field
            label="URL:"
            element={
              <div
                css={`
                  font-family: monospace;
                `}
              >
                coinosis.co/
                <input
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
            label="descripción:"
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
          <Field
            label="depósito por participante:"
            element={
              <div
                css={`
                  display: flex;
                `}
              >
                <input
                  value={feeETH}
                  onChange={setFeeETHRaw}
                  type="text"
                  css="width: 60px"
                />
                <div css="margin-left: 5px">xDAI</div>
                <div css="margin-left: 20px">(</div>
                <input
                  value={fee}
                  onChange={setFeeRaw}
                  type="text"
                  css={`
                    margin-left: 5px;
                    width: 60px;
                  `}
                />
                <div css="margin-left: 5px">USD )</div>
              </div>
            }
          />
          <Field
            label="fecha y hora de inicio:"
            element={
              <DatePicker
                dateFormat="dd 'de' MMMM 'de' yyyy, h:mm aa"
                selected={start}
                onChange={preSetStart}
                showTimeSelect
                timeCaption="hora"
                timeFormat="h:mm aa"
                timeIntervals={30}
                minDate={now}
                locale="es"
                css="width: 250px;"
              />
            }
          />
          <Field
            label="fecha y hora de finalización:"
            element={
              <DatePicker
                dateFormat="dd 'de' MMMM 'de' yyyy, h:mm aa"
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
            label="comenzar la videoconferencia"
            element={
              <input
                value={minutesBefore}
                onChange={preSetMinutesBefore}
                type="text"
                css={`
                  width: 60px;
                `}
              />
            }
            unit="minutos antes"
          />
          <Field
            label="y finalizarla"
            element={
              <input
                value={minutesAfter}
                onChange={preSetMinutesAfter}
                type="text"
                css={`
                  width: 60px;
                `}
              />
            }
            unit="minutos después"
          />
          <tr>
            <td/>
            <td>
              <button
                disabled={!formValid || creating}
                onClick={add}
              >
                crear
              </button>
            </td>
          </tr>
          <Field
            label={status ? 'estado:' : ''}
            element={status}
          />
        </tbody>
      </table>
    </div>
  );
}

const Field = ({ label, element, unit }) => {
  return (
    <tr>
      <td
        css={`
          width: 50%;
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
