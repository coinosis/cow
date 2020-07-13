import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import abi from '../contracts/ProxyEvent.abi.json';
import { Web3Context, AccountContext, BackendContext } from './coinosis';
import { Link, Loading, ATTENDEE_REGISTERED, NoContract } from './helpers';
import Account from './account';
import Attendance from './attendance';
import Distribute from './distribute';
import Meet from './meet';
import Assessment from './assessment';
import Result from './result';
import Footer from './footer';

const eventStates = {
  EVENT_CREATED: 0,
  CALL_STARTED: 1,
  EVENT_STARTED: 2,
  EVENT_ENDED: 3,
  CALL_ENDED: 4,
};

const userStates = {
  UNREGISTERED: 0,
  REGISTERED: 1,
  CLAPPED: 2,
  REWARDED: 3,
};

const contractStates = {
  CONTRACT_CREATED: 0,
  CONTRACT_FUNDED: 1,
  CLAPS_MADE: 2,
  DISTRIBUTION_MADE: 3,
};

export const ContractContext = createContext();

const Event = () => {

  const { eventURL } = useParams();
  const web3 = useContext(Web3Context);
  const { account, name: userName } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [contract, setContract] = useState();
  const [event, setEvent] = useState();
  const [attendees, setAttendees] = useState();
  const [users, setUsers] = useState([]);
  const [eventState, setEventState] = useState();
  const [userState, setUserState] = useState();
  const [contractState, setContractState] = useState();
  const [inCall, setInCall] = useState();

  useEffect(() => {
    if (eventState === undefined || userState === undefined) setInCall(false);
    const callOngoing = eventState >= eventStates.CALL_STARTED
    && eventState < eventStates.CALL_ENDED;
    const userRegistered = userState >= userStates.REGISTERED;
    setInCall(callOngoing && userRegistered);
  }, [ eventState, userState, setInCall ]);

  const updateEventState = useCallback(() => {
    const now = new Date();
    if (now < new Date(event.beforeStart)) {
      setEventState(eventStates.EVENT_CREATED);
    } else if (now < new Date(event.start)) {
      setEventState(eventStates.CALL_STARTED);
    } else if (now < new Date(event.end)) {
      setEventState(eventStates.EVENT_STARTED);
    } else if (now < new Date(event.afterEnd)) {
      setEventState(eventStates.EVENT_ENDED);
    } else {
      setEventState(eventStates.CALL_ENDED);
    }
  }, [ event, setEventState ]);

  useEffect(() => {
    const eventStateUpdater = setInterval(updateEventState, 3000);
    return () => {
      clearInterval(eventStateUpdater);
    }
  }, [ updateEventState ]);

  const updateUserState = useCallback(async () => {
    if (!contract || account === undefined) return;
    const transferFilter = await contract.getPastEvents(
      'Transfer',
      {filter: {attendee: account}, fromBlock: 0}
    );
    if (transferFilter.length > 0) {
      setUserState(userStates.REWARDED);
      return;
    }
    const userState = await contract.methods.states(account).call();
    setUserState(Number(userState));
  }, [ contract, account, setUserState ]);

  useEffect(() => {
    if (event === undefined || event.version !== 2) return;
    updateUserState();
    const userStateUpdater = setInterval(updateUserState, 3000);
    return () => {
      clearInterval(userStateUpdater);
    }
  }, [ event, updateUserState ]);

  const updateContractState = useCallback(async () => {
    if (contract === undefined || contract === null) return;
    const distributionEvents = await contract.getPastEvents(
      'Distribution',
      { fromBlock: 0 }
    );
    if (distributionEvents.length > 0) {
      setContractState(contractStates.DISTRIBUTION_MADE);
      return;
    }
    const claps = await contract.methods.totalClaps().call();
    if (claps > 0) {
      setContractState(contractStates.CLAPS_MADE);
      return;
    }
    const funds = await web3.eth.getBalance(contract._address);
    if (funds > 0) {
      setContractState(contractStates.CONTRACT_FUNDED);
      return;
    }
    setContractState(contractStates.CONTRACT_CREATED);
  }, [ contract, setContractState ]);

  useEffect(() => {
    if (event === undefined || event.version < 2) return;
    updateContractState();
    const contractStateUpdater = setInterval(updateContractState, 3000);
    return () => {
      clearInterval(contractStateUpdater);
    }
  }, [ event, updateContractState ]);

  const getAttendees = useCallback(async () => {
    if (!contract) return;
    const attendees = await contract.methods.getAttendees().call();
    setAttendees(previous => {
      if (previous && previous.length === attendees.length) return previous;
      return attendees;
    });
  }, [ contract ]);

  useEffect(() => {
    getAttendees();
    const updateAttendees = setInterval(getAttendees, 3000);
    return () => {
      clearInterval(updateAttendees);
    }
  }, [ getAttendees ]);

  const setContractRaw = useCallback(async address => {
    if (web3 === undefined || web3 === null) return;
    const contract = new web3.eth.Contract(abi, address);
    try {
      await contract.methods.version().call();
      setContract(contract);
    } catch (err) {
      setContract(null);
    }
  }, [ web3, abi ]);

  useEffect(() => {
    fetch(`${backendURL}/event/${eventURL}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        }
        return response.json();
      }).then(event => {
        if (event.version === 2) {
          setContractRaw(event.address);
        } else if (event.version === 1 || event.version === 0) {
          setAttendees(event.attendees);
        }
        setEvent(event);
      }).catch(err => {
        console.error(err);
      });
  }, [ backendURL, eventURL, setContractRaw ]);

  if (web3 === null) {
    return (
      <div>
        <Title text={event.name} />
        <Account/>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div>
        <Title text={event.name}/>
        <NoContract/>
      </div>
    );
  }

  if (
    attendees === undefined
    || userName === undefined
    || event === undefined
  ) return (
    <Loading/>
  );

  return (
    <ContractContext.Provider value={{ contract, version: event.version }}>
      { inCall === false && (<Title text={event.name} />) }
      { userState === userStates.UNREGISTERED && (
        <Attendance
          eventName={event.name}
          event={event.url}
          fee={event.fee}
          feeWei={event.feeWei}
          organizer={event.organizer}
          attendees={attendees}
          getAttendees={getAttendees}
          beforeStart={new Date(event.beforeStart)}
          end={new Date(event.end)}
          updateState={updateUserState}
          />
      ) }
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
            state={userState}
            setState={setUserState}
            updateState={updateUserState}
            url={event.url}
            attendees={attendees}
            users={users}
            setUsers={setUsers}
            />
          { event.version === 2 && userState >= ATTENDEE_REGISTERED && (
            <Distribute
              eventURL={event.url}
              end={new Date(event.end)}
              state={userState}
              updateState={updateUserState}
              />
          )}
        </div>
        <Meet
          id={event._id}
          eventName={event.name}
          account={account}
          userName={userName}
          users={users}
          setUsers={setUsers}
          beforeStart={new Date(event.beforeStart)}
          afterEnd={new Date(event.afterEnd)}
          />
      </div>
      <Result url={event.url} />
      <Footer hidden={event.version < 2} />
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

export default Event;
