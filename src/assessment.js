import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { ContractContext } from './event';
import {
  EtherscanLink,
  Loading,
  usePost,
  ATTENDEE_ATTENDING,
  ATTENDEE_CLICKED_SEND,
  ATTENDEE_SENT_CLAPS,
  ATTENDEE_CLAPPED,
} from './helpers';
import Account from './account';

const Assessment = ({
  state,
  setState,
  updateState,
  url: event,
  attendees,
  jitsters,
  ownClaps,
  currency,
  signature,
}) => {

  const web3 = useContext(Web3Context);
  const { contract, version } = useContext(ContractContext);
  const { account, name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [totalClaps] = useState(100);
  const [clapsLeft, setClapsLeft] = useState();
  const [assessment, setAssessment] = useState({});
  const [clapsError, setClapsError] = useState(false);
  const [proxy, setProxy] = useState();
  const [txHash, setTxHash] = useState();
  const [txState, setTxState] = useState(ATTENDEE_ATTENDING);
  const post = usePost();

  useEffect(() => {
    setAssessment({});
    setTxState(state);
  }, [ account, state ]);

  useEffect(() => {
    for (const i in attendees) {
      if (!(attendees[i].address in assessment)) {
        assessment[attendees[i].address] = 0;
      }
    }
    setAssessment(assessment);
  }, [ attendees ]);

  useEffect(() => {
    if (version === undefined || name === undefined) return;
    if (version > 1) return;
    fetch(`${backendURL}/assessment/${event}/${account}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        } else {
          return response.json();
        }
      }).then(data => {
        setAssessment(data.assessment);
        setState(ATTENDEE_CLAPPED);
      }).catch(error => {
        if (error.toString().includes('404')) {
          setState(ATTENDEE_ATTENDING);
        } else {
          console.error(error);
        }
      });
  }, [ backendURL, event, account ]);

  useEffect(() => {
    if (assessment && totalClaps) {
      const clapsLeft = computeClapsLeft(assessment)
      setClapsLeft(clapsLeft);
    }
  }, [assessment, totalClaps]);

  const computeClapsLeft = useCallback(assessment => {
    let clapsGiven = 0;
    for (const address in assessment) {
      clapsGiven += assessment[address];
    }
    return totalClaps - clapsGiven;
  }, [totalClaps]);

  const attemptAssessment = useCallback(assessmentFn => {
    const newAssessment = assessmentFn(assessment);
    const clapsLeft = computeClapsLeft(newAssessment);
    if (clapsLeft < 0) {
      setClapsError(true);
      return -1;
    }
    setClapsError(false);
    setAssessment(newAssessment);
    return clapsLeft;
  }, [ assessment ]);

  const sendToContract = useCallback(async (addresses, claps) => {
    const gas = 8500 * addresses.length + 40000;
    const gasPrice = '1000000000';
    await contract.methods.clap(addresses, claps)
      .send({ from: account, gas, gasPrice })
      .on('transactionHash', transactionHash => {
        setTxState(ATTENDEE_SENT_CLAPS);
        setTxHash(transactionHash);
      }).on('receipt', () => {
        updateState();
      }).on('error', () => {
        setTxState(ATTENDEE_ATTENDING);
      });
  }, [ contract, account ]);

  const sendToBackend = useCallback((addresses, claps) => {
    const object = { event, sender: account, addresses, claps };
    post('assessments', object, async (error, data) => {
      if (error) {
        setTxState(ATTENDEE_ATTENDING);
        console.error(error);
        return;
      }
      setTxState(ATTENDEE_SENT_CLAPS);
      let tx;
      do {
        tx = await web3.eth.getTransaction(data.result);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTxHash(tx.hash);
      } while (tx.blockHash === null)
      updateState();
    });
  }, [ event, account, post ]);

  useEffect(() => {
    if (contract === undefined || account === undefined) return;
    const getProxy = async () => {
      const proxy = await contract.methods.proxy(account).call();
      const number = parseInt(proxy, 16);
      setProxy(!!number);
    }
    getProxy();
  }, [ contract, account ]);

  const send = useCallback(async () => {
    setTxState(ATTENDEE_CLICKED_SEND);
    const addresses = Object.keys(assessment);
    const claps = Object.values(assessment);
    if (proxy) {
      sendToBackend(addresses, claps);
    } else {
      sendToContract(addresses, claps);
    }
  }, [ assessment, proxy, sendToBackend, sendToContract ]);

  if (account === null || name === null) {
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

  if (state === undefined) return <Loading/>

  return (
    <div
      css={`
        display: flex;
        justify-content: center;
      `}
    >
    <table>
      <Claps
        clapsLeft={clapsLeft}
        clapsError={clapsError}
        state={state}
        txHash={txHash}
        txState={txState}
        currency={currency}
      />
      <Users
        attendees={attendees}
        jitsters={jitsters}
        assessment={assessment}
        attemptAssessment={attemptAssessment}
        clapsError={clapsError}
        state={state}
        version={version}
        txState={txState}
        event={event}
        signature={signature}
        ownClaps={ownClaps}
        currency={currency}
      />
      <tfoot>
        <tr>
          <td/>
          <td
            colSpan={3}
            css={`
              text-align: center;
            `}
          >
            <button
              onClick={send}
              disabled={txState > ATTENDEE_ATTENDING}
            >
              {state >= ATTENDEE_CLAPPED
               ? 'enviado'
               : txState >= ATTENDEE_SENT_CLAPS ? 'enviando...'
               : 'enviar'
              }
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
    </div>
  );
}

const Claps = ({ clapsLeft, clapsError, state, txHash, txState, currency }) => {

  if (txState >= ATTENDEE_CLICKED_SEND) {
    return (
      <thead>
        <tr>
          <td
            colSpan={4}
            css={`
              text-align: center;
              font-weight: 700;
            `}
          >
            { state == ATTENDEE_CLAPPED
              ? 'gracias por tu tiempo!'
              : txState == ATTENDEE_CLICKED_SEND
              ? 'envía tus aplausos usando Metamask.'
              : txState == ATTENDEE_SENT_CLAPS
              ? (
                <EtherscanLink
                  type="tx"
                  value={txHash}
                  currency={currency}
                >
                  confirmando transacción...
                </EtherscanLink>
              )
              : ''
            }
          </td>
        </tr>
      </thead>
    );
  }

  return (
    <thead>
      <tr
        css={`
          color: ${clapsError ? '#a04040' : 'black'};
        `}
      >
        <td
          css={`
            text-align: right;
          `}
        >
          aplausos restantes:
        </td>
        <td
          css={`
            font-weight: ${clapsError ? 700 : 300};
            text-align: center;
          `}
          colSpan={3}
        >
          {clapsLeft}
        </td>
      </tr>
    </thead>
  );
}

const Users = ({
  attendees,
  jitsters,
  assessment,
  attemptAssessment,
  state,
  version,
  txState,
  event,
  signature,
  ownClaps,
  currency,
}) => {

  const { account } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [clapsLeft, setClapsLeft] = useState();

  const setClaps = useCallback((address, delta) => {
    const clapsLeft = attemptAssessment(assessment => {
      const newAssessment = { ...assessment };
      newAssessment[address] += delta;
      return newAssessment;
    });
    if (clapsLeft >= 0) {
      fetch(`${backendURL}/clap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          clapper: account,
          clapee: address,
          delta,
          signature,
        }),
      });
    }
    setClapsLeft(clapsLeft);
  }, [ assessment ]);

  return (
    <tbody>
      {attendees.map((attendee) => {
        const { address, name } = attendee;
        const jitster = jitsters && jitsters.find(j => j.displayName === name);
        const speaker = jitster && jitster.speaker;
        const claps = assessment[address] || 0;
         return (
           <User
             key={address}
             name={name}
             address={address}
             present={Boolean(jitster)}
             speaker={speaker}
             claps={claps}
             setClaps={delta => setClaps(address, delta)}
             state={state}
             version={version}
             txState={txState}
             clapsLeft={clapsLeft}
             ownClaps={ownClaps}
             currency={currency}
           />
         );
      })}
    </tbody>
  );
}

const User = ({
  name,
  address,
  present,
  speaker,
  claps,
  setClaps,
  state,
  version,
  txState,
  clapsLeft,
  ownClaps,
  currency,
}) => {

  const { account } = useContext(AccountContext);
  const [ownAddress, setOwnAddress] = useState(false);

  useEffect(() => {
    setOwnAddress(account === address);
  }, [account, address]);

  return (
    <tr>
      <td
        css={`
          text-align: right;
        `}
      >
        <EtherscanLink
          type="address"
          value={address}
          css={`
            color: ${present ? 'black' : '#a0a0a0'};
            background: ${speaker ? '#a0e0a0' : 'initial'};
            &:visited {
              color: ${present ? 'black' : '#a0a0a0'};
            }
          `}
          currency={currency}
        >
          {name}
        </EtherscanLink>
      </td>
      <td>
        <button
          disabled={
            txState >= ATTENDEE_CLICKED_SEND
              || ownAddress
              || claps === 0
          }
          onClick={() => { setClaps(-1); }}
        >
          -
        </button>
      </td>
      <td
        css={`
          width: 25px;
          display: flex;
          justify-content: center;
        `}
      >
        {
          ownAddress ? ownClaps :
          version === 2
            && state >= ATTENDEE_CLAPPED
            ? '***'
            : claps
        }
      </td>
      <td>
        <button
          disabled={
            txState >= ATTENDEE_CLICKED_SEND
              || ownAddress
              || clapsLeft === 0
          }
          onClick={() => { setClaps(1); }}
        >
          +
        </button>
      </td>
    </tr>
  );
}

export default Assessment;
