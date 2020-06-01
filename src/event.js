import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  NavLink,
  Switch,
  Route,
  Redirect,
  useParams,
  useRouteMatch,
} from 'react-router-dom';
import styled from 'styled-components';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { Link, Loading } from './helpers';
import Attendance from './attendance';
import Meet from './meet';
import Assessment from './assessment';
import Result from './result';
import contractJson from '../Event.json';

export const ATTENDANCE = 'asistencia';
export const ASSESSMENT = 'aplausos';
const RESULT = 'resultados';

const Event = () => {

  const { eventURL } = useParams();
  const web3 = useContext(Web3Context);
  const { account, name: userName } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [contract, setContract] = useState();
  const [name, setName] = useState();
  const [url, setUrl] = useState();
  const [id, setId] = useState();
  const [fee, setFee] = useState();
  const [feeWei, setFeeWei] = useState();
  const [beforeStart, setBeforeStart] = useState();
  const [afterEnd, setAfterEnd] = useState();
  const [organizer, setOrganizer] = useState();
  const [attendees, setAttendees] = useState();
  const [users, setUsers] = useState([]);
  const [assessmentSent, setAssessmentSent] = useState();
  const match = useRouteMatch();

  const getAttendees = useCallback(async () => {
    if (!contract) return;
    const attendees = await contract.methods.getAttendees().call();
    setAttendees(previous => {
      if (previous && previous.length === attendees.length) return previous;
      return attendees;
    });
  }, [ contract ]);

  const setContractRaw = useCallback(address => {
    const contract = new web3.eth.Contract(contractJson.abi, address);
    setContract(contract);
  }, [ web3, contractJson ]);

  useEffect(() => {
    getAttendees();
    const updateAttendees = setInterval(getAttendees, 10000);
    return () => {
      clearInterval(updateAttendees);
    }
  }, [ getAttendees ]);

  useEffect(() => {
    fetch(`${backendURL}/event/${eventURL}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        }
        return response.json();
      }).then(({
        _id,
        address,
        name,
        url,
        fee,
        feeWei,
        beforeStart,
        afterEnd,
        organizer,
        attendees,
      }) => {
        if (address) {
          setContractRaw(address);
        } else {
          setAttendees(attendees);
        }
        setId(_id);
        setName(name);
        setUrl(url);
        setFee(fee);
        setFeeWei(feeWei);
        setBeforeStart(new Date(beforeStart));
        setAfterEnd(new Date(afterEnd));
        setOrganizer(organizer);
      }).catch(err => {
        console.error(err);
      });
  }, [ backendURL, eventURL, setContractRaw ]);

  if (attendees === undefined || userName === undefined) return <Loading/>

  return (
    <div>
      <Title text={name} />
      <Tabs/>
      <Switch>
        <Route path={`${match.path}/${ATTENDANCE}`}>
          <Attendance
            contract={contract}
            eventName={name}
            event={url}
            fee={fee}
            feeWei={feeWei}
            organizer={organizer}
            attendees={attendees}
            getAttendees={getAttendees}
            beforeStart={beforeStart}
            afterEnd={afterEnd}
          />
        </Route>
        <Route path={`${match.path}/${ASSESSMENT}`}>
          <div
            css={`
              display: flex;
            `}
          >
            <Assessment
              sent={assessmentSent}
              setSent={setAssessmentSent}
              url={url}
              attendees={attendees}
              users={users}
              setUsers={setUsers}
            />
            <Meet
              id={id}
              account={account}
              userName={userName}
              users={users}
              setUsers={setUsers}
              beforeStart={beforeStart}
              afterEnd={afterEnd}
            />
          </div>
        </Route>
        <Route path={`${match.path}/${RESULT}`}>
          <Result url={url} />
        </Route>
        <Route path={match.path}>
          <Redirect to={`${match.url}/${ATTENDANCE}`} />
        </Route>
      </Switch>
    </div>
  );
}

const Title = ({ text }) => {
  return (
    <div
      css={`
        display: flex;
      `}
    >
      <Link to="/" css={'width: 60px'}>← atrás</Link>
      <div
        css={`
          display: flex;
          justify-content: center;
          margin: 40px;
          font-size: 32px;
          flex-grow: 1;
        `}
      >
        {text}
      </div>
      <div css={'width: 60px'}/>
    </div>
  );
}

const Tabs = () => {
  return (
    <div
      css={`
        display: flex;
        justify-content: center;
        margin-bottom: 50px;
      `}
    >
      <Tab name={ATTENDANCE} />
      <Tab name={ASSESSMENT} />
      <Tab name={RESULT} />
    </div>
  );
}

const Tab = ({ name }) => {

  const match = useRouteMatch();
  const backendURL = useContext(BackendContext);

  return (
    <StyledTab
      to={`${match.url}/${name}`}
      activeClassName="selected"
      disabled={backendURL === null}
    >
      {name}
    </StyledTab>
  );
}

export const StyledTab = styled(NavLink)`
  padding: 10px;
  background: #f8f8f8;
  border: 1px solid #e0e0e0;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  user-select: none;
  color: ${({ disabled }) => disabled ? '#505050' : 'black'};
  text-decoration: none;
  &.selected {
    background: #e0e0e0;
  }
`

export default Event;
