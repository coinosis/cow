import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AccountContext, BackendContext } from './coinosis';
import { ATTENDANCE } from './event';
import {
  environment,
  EtherscanLink,
  Link,
  Loading,
  useGetUser,
  useGasPrice,
  usePost,
  ATTENDEE_REGISTERED,
  ATTENDEE_SENT_CLAPS,
  ATTENDEE_CLAPPED,
} from './helpers';
import Account from './account';

const Assessment = ({
  contract,
  state,
  setState,
  url: event,
  attendees,
  users,
  setUsers,
  version,
}) => {

  const { account, name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [totalClaps, setTotalClaps] = useState();
  const [clapsLeft, setClapsLeft] = useState();
  const [assessment, setAssessment] = useState({});
  const [clapsError, setClapsError] = useState(false);
  const post = usePost();
  const getGasPrice = useGasPrice();

  useEffect(() => {
    for (const i in attendees) {
      if (!(attendees[i] in assessment)) {
        assessment[attendees[i]] = 0;
      }
    }
    setAssessment(assessment);
    setTotalClaps((attendees.length - 1) * 3);
  }, [ attendees ]);

  const updateState = useCallback(async () => {
    const state = await contract.methods.states(account).call();
    setState(state);
  }, [ contract, account ]);

  useEffect(() => {
    if (
      version === undefined
        || contract === undefined
        || account === undefined
    ) return;
    if (version !== 2) return;
    updateState();
  }, [ updateState ]);

  useEffect(() => {
    if (
      version === undefined
        || contract === undefined
        || name === undefined
    ) return;
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
  }, [ contract, backendURL, event, account ]);

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

  const send = useCallback(async () => {
    const addresses = Object.keys(assessment);
    const claps = Object.values(assessment);
    const gasPrice = await getGasPrice();
    const result = await contract.methods.clap(addresses, claps)
          .send({ from: account, gasPrice: gasPrice.propose })
          .on('transactionHash', transactionHash => {
            setState(ATTENDEE_SENT_CLAPS);
          }).on('receipt', receipt => {
            updateState();
          });
  }, [ assessment, getGasPrice, contract, account ]);

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
      />
      <Users
        attendees={attendees}
        users={users}
        setUsers={setUsers}
        assessment={assessment}
        attemptAssessment={attemptAssessment}
        clapsError={clapsError}
        disabled={state >= ATTENDEE_SENT_CLAPS}
      />
      <tfoot>
        <tr>
          <td/>
          <td>
            <button
              onClick={send}
              disabled={state >= ATTENDEE_SENT_CLAPS}
            >
              {state >= ATTENDEE_CLAPPED
               ? 'enviado'
               : state == ATTENDEE_SENT_CLAPS ? 'enviando...'
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

const Claps = ({ clapsLeft, clapsError, state }) => {

  if (state >= ATTENDEE_SENT_CLAPS) {
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
            { state == ATTENDEE_SENT_CLAPS
              ? 'confirmando transacción...'
              : 'gracias por tu tiempo!'
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
  disabled,
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
             disabled={disabled}
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
  disabled,
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
          value={claps}
          onChange={e => setClaps(e.target.value)}
          disabled={disabled || ownAddress}
          css={`
            width: 60px;
          `}
        />
      </td>
    </tr>
  );
}

export default Assessment;
