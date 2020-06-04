import React, { useContext, useEffect, useCallback, useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { es } from 'date-fns/esm/locale';
import {
  addHours,
  setHours,
  addMinutes,
  setMinutes,
  subMinutes
} from 'date-fns';
import contractJson from '../Event.json';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import {
  formatDate,
  usePost,
  useETHPrice,
  useGasPrice,
  timestampInSeconds,
  dateFromTimestamp,
} from './helpers';

registerLocale('es', es);

const AddEvent = ({ setEvents }) => {

  const post = usePost();
  const getETHPrice = useETHPrice();
  const getGasPrice = useGasPrice();
  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const { account, name: userName } = useContext(AccountContext);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [fee, setFee] = useState('');
  const [now] = useState(new Date());
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [minutesBefore, setMinutesBefore] = useState(30);
  const [minutesAfter, setMinutesAfter] = useState(30);
  const [formValid, setFormValid] = useState(false);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState();

  useEffect(() => {
    const valid =
          name !== ''
          && url !== ''
          && description !== ''
          && fee !== ''
          && start !== ''
          && end !== ''
          && userName !== null;
    setFormValid(valid);
    setStatus();
  }, [name, url, description, fee, start, end, userName]);

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

  const preSetFee = useCallback(e => {
    const { value } = e.target;
    if (value === '' || (value.length > 1 && value[value.length - 1] === '.')) {
      setFee(value);
      return;
    }
    if (isNaN(value)) return;
    const number = Number(value);
    const positive = Math.abs(number);
    const rounded = Math.round(positive * 100) / 100;
    setFee(rounded);
  }, []);

  const preSetStart = useCallback(start => {
    setStart(start);
    setEnd(addHours(start, 1));
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

  const addToBackend = useCallback((address, id, feeWei, end) => {
    const organizer = account;
    const beforeStart = subMinutes(start, minutesBefore);
    const endDate = dateFromTimestamp(end);
    const afterEnd = addMinutes(endDate, minutesAfter);
    const object = {
      address,
      name,
      url: id,
      description,
      feeWei,
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
    const contract = new web3.eth.Contract(contractJson.abi);
    const ethPrice = await getETHPrice();
    const feeETH = fee / ethPrice;
    const feeWei = web3.utils.toWei(String(feeETH.toFixed(18)));
    const endTimestamp = timestampInSeconds(end);
    const gasPrice = await getGasPrice();
    const deployData = {
      data: contractJson.bytecode,
      arguments: [url, feeWei, endTimestamp],
    };
    const deployment = await contract.deploy(deployData);
    setStatus('usa Metamask para desplegar el contrato. '
              + 'Esta acción tiene costo.');
    const txOptions = {
      from: account,
      gas: 1600000,
      gasPrice: gasPrice.propose,
    };
    const instance = await deployment.send(txOptions)
          .on('error', error => {
            setStatus(error.message.substring(0, 60));
            setCreating(false);
          }).on('transactionHash', receipt => {
            setStatus(
              'esperando a que la transacción sea incluida en la blockchain...'
            );
          }).on('receipt', receipt => {
            setStatus('usa Metamask para firmar el contrato.');
          });
    const actualId = await instance.methods.id().call();
    const actualFeeWei = await instance.methods.fee().call();
    const actualEnd = await instance.methods.end().call();
    return {
      address: instance._address,
      id: actualId,
      feeWei: actualFeeWei,
      end: actualEnd,
    };
  }, [
    web3,
    contractJson,
    url,
    fee,
    getETHPrice,
    account,
    getGasPrice,
    end,
    minutesAfter,
  ]);

  const add = useCallback(async () => {
    const { address, id, feeWei, end } = await deployContract();
    addToBackend(address, id, feeWei, end);
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
                https://coinosis.github.io/#/
                <input
                  value={url}
                  onChange={preSetUrl}
                  css={`
                    width: 273px;
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
                  width: 498px;
                  height: 200px;
                `}
              />
            }
          />
          <Field
            label="costo de inscripción:"
            element={
              <input
                value={fee}
                onChange={preSetFee}
                type="text"
                css={`
                  width: 60px;
                `}
              />
            }
            unit="USD"
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
