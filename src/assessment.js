import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { ContractContext } from './event';
import {
  ExternalLink,
  Loading,
  usePost,
  ATTENDEE_REGISTERED,
  ATTENDEE_CLICKED_SEND,
  ATTENDEE_SENT_CLAPS,
  ATTENDEE_CLAPPED,
} from './helpers';
import Account from './account';
import { useT } from './i18n';

const Assessment = ({
  state,
  setState,
  updateState,
  url: event,
  attendees,
  jitsters,
  currency,
  signature,
  showSend,
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
  const [txState, setTxState] = useState(ATTENDEE_REGISTERED);
  const post = usePost();
  const t = useT();

  const zeroAllClaps = useCallback(() => {
    for(const address in assessment) {
      const negativeClaps = assessment[address] * -1;
      navigator.sendBeacon(`${backendURL}/clap`, JSON.stringify({
        event,
        clapper: account,
        clapee: address,
        delta: negativeClaps,
        signature,
      }));
    }
  }, [ assessment, backendURL, event, account, signature ]);

  useEffect(() => {
    const handleUnload = () => {
      if (state < ATTENDEE_SENT_CLAPS) {
        zeroAllClaps();
      }
    }
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    }
  }, [ state, zeroAllClaps ]);

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
          setState(ATTENDEE_REGISTERED);
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
        setTxState(ATTENDEE_REGISTERED);
      });
  }, [ contract, account ]);

  const sendToBackend = useCallback((addresses, claps) => {
    const object = { event, sender: account, addresses, claps };
    post('assessments', object, async (error, data) => {
      if (error) {
        setTxState(ATTENDEE_REGISTERED);
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
            { showSend && (
              <button
                onClick={send}
                disabled={txState > ATTENDEE_REGISTERED}
              >
                {state >= ATTENDEE_CLAPPED
                 ? t('sent_masculine')
                 : txState >= ATTENDEE_SENT_CLAPS ? t('sending')
                 : t('send')
                }
              </button>
            ) }
          </td>
        </tr>
      </tfoot>
    </table>
    </div>
  );
}

const Claps = ({ clapsLeft, clapsError, state, txHash, txState, currency }) => {

  const t = useT();

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
              ? t('claps_sent')
              : txState == ATTENDEE_CLICKED_SEND
              ? t('send_claps')
              : txState == ATTENDEE_SENT_CLAPS
              ? (
                <ExternalLink
                  type="tx"
                  value={txHash}
                  currency={currency}
                >
                  { t('waiting_for_confirmation') }
                </ExternalLink>
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
          { t('remaining_claps') }
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
      navigator.sendBeacon(`${backendURL}/clap`, JSON.stringify({
        event,
        clapper: account,
        clapee: address,
        delta,
        signature,
      }));
    }
    setClapsLeft(clapsLeft);
  }, [ assessment, event, account, signature ]);

  return (
    <tbody>
      {attendees.map((attendee) => {
        const { address, name } = attendee;
        if (address === account) return null;
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
  currency,
}) => {

  return (
    <tr>
      <td
        css={`
          text-align: right;
        `}
      >
        <ExternalLink
          type="3box"
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
        </ExternalLink>
      </td>
      <td>
        <button
          disabled={ txState >= ATTENDEE_CLICKED_SEND || claps === 0 }
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
          version === 2
            && state >= ATTENDEE_CLAPPED
            ? '***'
            : claps
        }
      </td>
      <td>
        <button
          disabled={ txState >= ATTENDEE_CLICKED_SEND || clapsLeft === 0 }
          onClick={() => { setClaps(1); }}
        >
          +
        </button>
      </td>
    </tr>
  );
}

export default Assessment;
