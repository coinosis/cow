import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AccountContext, BackendContext } from './coinosis';
import { ATTENDANCE } from './event';
import { environment, EtherscanLink, Link, Loading, usePost } from './helpers';
import Account from './account';

const Assessment = ({
  sent,
  setSent,
  url: event,
  attendees,
}) => {

  const { account, name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [totalClaps, setTotalClaps] = useState();
  const [clapsLeft, setClapsLeft] = useState();
  const [assessment, setAssessment] = useState({});
  const [clapsError, setClapsError] = useState(false);
  const post = usePost();

  useEffect(() => {
    if (!name) return;
    fetch(`${backendURL}/assessment/${event}/${account}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        } else {
          return response.json();
        }
      }).then(data => {
        setAssessment(data.assessment);
        setSent(true);
      }).catch(error => {
        if (error.toString().includes('404')) {
          setSent(false);
          const assessment = {};
          for (const key in attendees) {
            assessment[attendees[key].address] = 0;
          }
          setAssessment(assessment);
          setTotalClaps((attendees.length - 1) * 3);
        } else {
          console.error(error);
        }
      });
  }, [backendURL, event, account, attendees, name]);

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

  const send = useCallback(() => {
    const selflessAssessment = { ...assessment };
    delete selflessAssessment[account];
    const object = { event, sender: account, assessment: selflessAssessment };
    post('assessments', object, (error, data) => {
      if(error) {
        console.error(error);
        return;
      }
      setAssessment(data.assessment);
      setSent(true);
    });
  }, [account, assessment]);

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

  if (sent === undefined) return <Loading/>

  if (!attendees.map(a => a.address).includes(account)) {
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
        sent={sent}
      />
      <Users
        users={attendees}
        assessment={assessment}
        attemptAssessment={attemptAssessment}
        clapsError={clapsError}
        disabled={sent}
      />
      <tfoot>
        <tr>
          <td/>
          <td>
            <button
              onClick={send}
              disabled={sent}
            >
              {sent ? 'enviado' : 'enviar'}
            </button>
          </td>
        </tr>
      </tfoot>
    </table>
    </div>
  );
}

const Claps = ({ clapsLeft, clapsError, sent }) => {

  if (sent) {
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
            gracias por tu tiempo!
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

const Users = ({ users, assessment, attemptAssessment, disabled }) => {

  const setClaps = useCallback((address, value) => {
    if (isNaN(value)) return;
    const claps = Math.abs(Math.floor(Number(value)))
    attemptAssessment(assessment => {
      const newAssessment = {...assessment}
      newAssessment[address] = +claps;
      return newAssessment;
    });
  }, [assessment]);

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
