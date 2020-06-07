import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  NavLink,
  Switch,
  Route,
  Redirect,
  useParams,
  useRouteMatch,
} from 'react-router-dom';
import styled from 'styled-components';
import contractJson from '../Event.json';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { Link, Loading, ATTENDEE_REGISTERED, NoContract } from './helpers';
import Attendance from './attendance';
import Distribute from './distribute';
import Meet from './meet';
import Assessment from './assessment';
import Result from './result';
import Footer from './footer';

export const ATTENDANCE = 'asistencia';
export const ASSESSMENT = 'aplausos';
const RESULT = 'resultados';

export const ContractContext = createContext();

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
  const [end, setEnd] = useState();
  const [beforeStart, setBeforeStart] = useState();
  const [afterEnd, setAfterEnd] = useState();
  const [organizer, setOrganizer] = useState();
  const [attendees, setAttendees] = useState();
  const [users, setUsers] = useState([]);
  const [state, setState] = useState();
  const [version, setVersion] = useState();
  const match = useRouteMatch();

  const updateState = useCallback(async () => {
    if (!contract || account === undefined) return;
    const state = await contract.methods.states(account).call();
    setState(state);
  }, [ contract, account ]);

  useEffect(() => {
    if (version === undefined || version !== 2) return;
    updateState();
  }, [ version, updateState ]);

  const getAttendees = useCallback(async () => {
    if (!contract) return;
    const attendees = await contract.methods.getAttendees().call();
    setAttendees(previous => {
      if (previous && previous.length === attendees.length) return previous;
      return attendees;
    });
  }, [ contract ]);

  const setContractRaw = useCallback(async address => {
    if (web3 === undefined) return;
    const contract = new web3.eth.Contract(contractJson.abi, address);
    try {
      await contract.methods.version().call();
      setContract(contract);
    } catch (err) {
      setContract(null);
    }
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
        end,
        beforeStart,
        afterEnd,
        organizer,
        attendees,
        version,
      }) => {
        if (version === 2) {
          setContractRaw(address);
        } else if (version === 1 || version === 0) {
          setAttendees(attendees);
        }
        setId(_id);
        setName(name);
        setUrl(url);
        setFee(fee);
        setFeeWei(feeWei);
        setEnd(new Date(end));
        setBeforeStart(new Date(beforeStart));
        setAfterEnd(new Date(afterEnd));
        setOrganizer(organizer);
        setVersion(version);
      }).catch(err => {
        console.error(err);
      });
  }, [ backendURL, eventURL, setContractRaw ]);

  if (contract === null) {
    return (
      <div>
        <Title text={name}/>
        <Tabs/>
        <NoContract/>
      </div>
    );
  }

  if (attendees === undefined || userName === undefined) return <Loading/>

  return (
    <ContractContext.Provider value={{ contract, version }}>
      <Title text={name} />
      <Tabs/>
      <Switch>
        <Route path={`${match.path}/${ATTENDANCE}`}>
          <Attendance
            eventName={name}
            event={url}
            fee={fee}
            feeWei={feeWei}
            organizer={organizer}
            attendees={attendees}
            getAttendees={getAttendees}
            beforeStart={beforeStart}
            afterEnd={afterEnd}
            updateState={updateState}
          />
        </Route>
        <Route path={`${match.path}/${ASSESSMENT}`}>
          <div
            css={`
              display: flex;
            `}
          >
            <div
              css={`
                display: flex;
                flex-direction: column;
              `}
            >
              <Assessment
                state={state}
                setState={setState}
                updateState={updateState}
                url={url}
                attendees={attendees}
                users={users}
                setUsers={setUsers}
              />
              { version === 2 && state >= ATTENDEE_REGISTERED && (
                <Distribute
                  eventURL={url}
                  end={end}
                  state={state}
                  updateState={updateState}
                />
              )}
            </div>
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
      <Footer hidden={version < 2} />
    </ContractContext.Provider>
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
