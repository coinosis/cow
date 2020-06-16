import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { ATTENDANCE, ContractContext } from './event';
import {
  environment,
  EtherscanLink,
  Link,
  Loading,
  useGetUser,
  useGasPrice,
  usePost,
  ATTENDEE_REGISTERED,
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
  users,
  setUsers,
}) => {

  const web3 = useContext(Web3Context);
  const { contract, version } = useContext(ContractContext);
  const { account, name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [totalClaps, setTotalClaps] = useState();
  const [clapsLeft, setClapsLeft] = useState();
  const [assessment, setAssessment] = useState({});
  const [clapsError, setClapsError] = useState(false);
  const [proxy, setProxy] = useState();
  const [txHash, setTxHash] = useState();
  const [txState, setTxState] = useState(ATTENDEE_REGISTERED);
  const post = usePost();
  const getGasPrice = useGasPrice();

  useEffect(() => {
    setAssessment({});
    setTxState(state);
  }, [ account ]);

  useEffect(() => {
    for (const i in attendees) {
      if (!(attendees[i] in assessment)) {
        assessment[attendees[i]] = 0;
      }
    }
    setAssessment(assessment);
    setTotalClaps((attendees.length - 1) * 3);
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
      return;
    }
    setClapsError(false);
    setAssessment(newAssessment);
  }, [assessment]);

  const sendToContract = useCallback(async (addresses, claps) => {
    const gasPrice = await getGasPrice();
    const result = await contract.methods.clap(addresses, claps)
          .send({ from: account, gasPrice: gasPrice.propose })
          .on('transactionHash', transactionHash => {
            setTxState(ATTENDEE_SENT_CLAPS);
            setTxHash(transactionHash);
          }).on('receipt', receipt => {
            updateState();
          });
  }, [ getGasPrice, contract, account ]);

  const sendToBackend = useCallback((addresses, claps) => {
    const object = { event, sender: account, addresses, claps };
    post('assessments', object, async (error, data) => {
      if (error) {
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

  if (!attendees.includes(account)) {
    return (
      <div
        css={`
          display: flex;
          justify-content: center;
        `}
      >
        <Link to={`${event}/${ATTENDANCE}`}>
          inscríbete
        </Link>
        para poder aplaudir.
      </div>
    );
  }

  if (attendees.length === 1) {
    return (
      <div
        css={`
          display: flex;
          justify-content: center;
        `}
      >
        nadie más se ha inscrito todavía.
      </div>
    );
  }

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
      />
      <Users
        attendees={attendees}
        users={users}
        setUsers={setUsers}
        assessment={assessment}
        attemptAssessment={attemptAssessment}
        clapsError={clapsError}
        state={state}
        version={version}
        txState={txState}
      />
      <tfoot>
        <tr>
          <td/>
          <td>
            <button
              onClick={send}
              disabled={txState > ATTENDEE_REGISTERED}
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

const Claps = ({ clapsLeft, clapsError, state, txHash, txState }) => {

  if (txState >= ATTENDEE_CLICKED_SEND) {
    return (
      <thead>
        <tr>
          <td
            colSpan={2}
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
          `}
        >
          {clapsLeft}
        </td>
      </tr>
    </thead>
  );
}

const Users = ({
  attendees,
  users,
  setUsers,
  assessment,
  attemptAssessment,
  state,
  version,
  txState,
}) => {

  const getUser = useGetUser();

  useEffect(() => {
    if (users && users.length === attendees.length) return;
    const updateUsers = async () => {
      const userAddresses = users.map(user => user.address);
      for (const i in attendees) {
        if (userAddresses.includes(attendees[i])) continue;
        const user = await getUser(attendees[i]);
        setUsers(prevUsers => {
          const nextUsers = [ ...prevUsers, user ];
          nextUsers.sort((a, b) => a.name.localeCompare(b.name));
          return nextUsers;
        });
      }
    }
    updateUsers();
  }, [ attendees, getUser ]);

  const setClaps = useCallback((address, value) => {
    if (isNaN(value)) return;
    const claps = Math.abs(Math.floor(Number(value)))
    attemptAssessment(assessment => {
      const newAssessment = {...assessment}
      newAssessment[address] = +claps;
      return newAssessment;
    });
  }, [assessment]);

  if (users === undefined) return <Loading/>

  return (
    <tbody>
      {users.map((user, i) => {
        const { address, name, present, speaker } = user;
        const claps = assessment[address] || '';
        const hasFocus = i === 0;
         return (
           <User
             key={address}
             hasFocus={hasFocus}
             name={name}
             address={address}
             present={present}
             speaker={speaker}
             claps={claps}
             setClaps={value => setClaps(address, value)}
             state={state}
             version={version}
             txState={txState}
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
  hasFocus,
  state,
  version,
  txState,
}) => {

  const clapInput = createRef();
  const { account } = useContext(AccountContext);
  const [ownAddress, setOwnAddress] = useState(false);

  useEffect(() => {
    if (hasFocus) {
      clapInput.current.focus();
    }
  }, [hasFocus]);

  useEffect(() => {
    setOwnAddress(account === address);
  }, [account, address]);

  if (address === '0x000') {
    return (
      <tr>
        <td
          css={`
            text-align: right;
          `}
        >
          <span
            css={`
              color: ${present ? 'black' : '#a0a0a0'};
              background: ${speaker ? '#a0e0a0' : 'initial'};
            `}
          >
            {name}
          </span>
        </td>
        <td/>
      </tr>
    );
  }

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
        >
          {name}
        </EtherscanLink>
      </td>
      <td>
        <input
          ref={clapInput}
          type="text"
          value={
            version === 2
              && state >= ATTENDEE_CLAPPED
              && !ownAddress
              ? '***'
              : claps
          }
          onChange={e => setClaps(e.target.value)}
          disabled={txState >= ATTENDEE_CLICKED_SEND || ownAddress}
          css={`
            width: 60px;
          `}
        />
      </td>
    </tr>
  );
}

export default Assessment;
