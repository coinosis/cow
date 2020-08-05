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
import { Link, Loading, NoContract, convertDates, useGetUser } from './helpers';
import Account from './account';
import Attendance from './attendance';
import Distribute from './distribute';
import Meet from './meet';
import Assessment from './assessment';
import Result from './result';
import Footer from './footer';
import { differenceInDays, formatDistance } from 'date-fns'
import { es } from 'date-fns/esm/locale';

const eventStates = {
  EVENT_CREATED: 0,
  CALL_STARTED: 1,
  EVENT_STARTED: 2,
  EVENT_HALFWAY_THROUGH: 3,
  EVENT_ABOUT_TO_END: 4,
  EVENT_ENDED: 5,
  CALL_ENDED: 6,
};

export const userStates = {
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
  const [eventState, setEventState] = useState();
  const [userState, setUserState] = useState();
  const [contractState, setContractState] = useState();
  const [inEvent, setInEvent] = useState();
  const [reward, setReward] = useState();
  const [now, setNow] = useState(new Date());
  const getUser = useGetUser();

  useEffect(() => {
    const time = setInterval(() => { setNow(new Date()); }, 1000);
    return () => {
      clearInterval(time);
    }
  }, [ setNow ]);

  useEffect(() => {
    if (eventState === undefined || userState === undefined) return;
    const eventOngoing = eventState >= eventStates.EVENT_STARTED
          && eventState < eventStates.EVENT_ENDED;
    const userRegistered = userState >= userStates.REGISTERED;
    setInEvent(userRegistered && eventOngoing);
  }, [ eventState, userState ]);

  const updateEventState = useCallback(() => {
    if (event === undefined) return;
    if (now < event.beforeStart) {
      setEventState(eventStates.EVENT_CREATED);
    } else if (now < event.start) {
      setEventState(eventStates.CALL_STARTED);
    } else if (now < event.end - (event.end - event.start) * 0.5) {
      setEventState(eventStates.EVENT_STARTED);
    } else if (now < event.end - (event.end - event.start) * 0.1) {
      setEventState(eventStates.EVENT_HALFWAY_THROUGH);
    } else if (now < event.end) {
      setEventState(eventStates.EVENT_ABOUT_TO_END);
    } else if (now < event.afterEnd) {
      setEventState(eventStates.EVENT_ENDED);
    } else {
      setEventState(eventStates.CALL_ENDED);
    }
  }, [ event, setEventState, now ]);

  useEffect(() => {
    updateEventState();
    const eventStateUpdater = setInterval(updateEventState, 3000);
    return () => {
      clearInterval(eventStateUpdater);
    }
  }, [ updateEventState ]);

  const updateUserState = useCallback(async () => {
    if (!contract || !account) return;
    const transferFilter = await contract.getPastEvents(
      'Transfer',
      {filter: {attendee: account}, fromBlock: 0}
    );
    if (transferFilter.length > 0) {
      const { reward } = transferFilter[0].returnValues;
      setReward(reward);
      setUserState(userStates.REWARDED);
      return;
    }
    const userState = await contract.methods.states(account).call();
    setUserState(Number(userState));
  }, [ contract, account, setUserState, setReward ]);

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
    const addresses = await contract.methods.getAttendees().call();
    if (!addresses.length) {
      setAttendees([]);
      return;
    }
    if (attendees === undefined) {
      const nextAttendees = await Promise.all(addresses.map(a => getUser(a)));
      setAttendees(nextAttendees);
      return;
    }
    if (attendees.length === addresses.length) return;
    const currentAddresses = attendees.map(a => a.address);
    const nextAttendees = [ ...attendees ];
    for (const address of addresses) {
      if (currentAddresses.includes(address)) continue;
      const attendee = await getUser(address);
      nextAttendees.push(attendee);
    }
    setAttendees(nextAttendees);
  }, [ contract, attendees, setAttendees, getUser ]);

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
        const eventWithDates = convertDates(event);
        setEvent(eventWithDates);
      }).catch(err => {
        console.error(err);
      });
  }, [ backendURL, eventURL, setContractRaw ]);

  if (event === undefined) return <Loading/>;

  if (web3 === null || account === null) {
    return (
      <div>
        <Title
          text={event.name}
          now={now}
          start={event.start}
          end={event.end}
          eventState={eventState}
        />
        <div
          css={`
            display: flex;
            justify-content: center;
          `}
        >
          <Account />
        </div>
      </div>
    );
  }

  if (contract === null) {
    return (
      <div>
        <Title
          text={event.name}
          now={now}
          start={event.start}
          end={event.end}
          eventState={eventState}
        />
        <NoContract/>
      </div>
    );
  }

  if (attendees === undefined) return <Loading/>;

  return (
    <ContractContext.Provider value={{ contract, version: event.version }}>
      { inEvent === false && (
        <Title
          text={event.name}
          now={now}
          start={event.start}
          end={event.end}
          eventState={eventState}
          />
      ) }
      { (eventState < eventStates.CALL_STARTED
        || (userState === userStates.UNREGISTERED
        && eventState < eventStates.EVENT_ABOUT_TO_END)) && (
          <Attendance
            eventName={event.name}
            event={event.url}
            fee={event.fee}
            feeWei={event.feeWei}
            organizer={event.organizer}
            attendees={attendees.map(a => a.address)}
            getAttendees={getAttendees}
            beforeStart={event.beforeStart}
            end={event.end}
            updateState={updateUserState}
            />
        ) }
      { contractState === contractStates.DISTRIBUTION_MADE && (
        <Result url={event.url} />
      ) }
        <div css="display: flex">
          { userState >= userStates.REGISTERED
            && eventState >= eventStates.EVENT_STARTED
            && contractState < contractStates.DISTRIBUTION_MADE
            && (
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
                />
              <Distribute
                eventURL={event.url}
                end={event.end}
                state={userState}
                updateState={updateUserState}
                reward={reward}
                />
            </div>
          ) }
          { userState >= userStates.REGISTERED
            && eventState >= eventStates.CALL_STARTED
            && (contractState < contractStates.DISTRIBUTION_MADE
                || eventState < eventStates.CALL_ENDED)
            && (
            <Meet
              id={event._id}
              eventName={event.name}
              account={account}
              userName={userName}
              users={attendees}
              setUsers={setAttendees}
              beforeStart={event.beforeStart}
              afterEnd={event.afterEnd}
              />
          ) }
        </div>
      <Footer hidden={event.version < 2} />
    </ContractContext.Provider>
  );
}

const Title = ({ text, now, start, end, eventState }) => {

  const [close, setClose] = useState();
  const [subtitle, setSubtitle] = useState();

  useEffect(() => {
    if (now === undefined || start === undefined) return;
    const difference = differenceInDays(now, start);
    setClose(difference === 0);
  }, [ setClose, now, start ]);

  useEffect(() => {
    if (
      now === undefined
      || start === undefined
      || end == undefined
      || close === undefined
      || eventState === undefined
    ) return;
    const dateOptions = { locale: es, addSuffix: true, includeSeconds: true };
    if (close === false) {
      setSubtitle(start.toLocaleString());
    } else if (eventState >= eventStates.EVENT_ENDED) {
      const distance = formatDistance(end, now, dateOptions);
      setSubtitle(`terminó ${distance}`);
    } else if (eventState < eventStates.EVENT_STARTED) {
      const distance = formatDistance(start, now, dateOptions);
      setSubtitle(`comenzará ${distance}`);
    } else if (eventState === eventStates.EVENT_STARTED) {
      const distance = formatDistance(start, now, dateOptions);
      setSubtitle(`comenzó ${distance}`);
    } else if (eventState === eventStates.EVENT_HALFWAY_THROUGH) {
      const distance = formatDistance(end, now, dateOptions);
      setSubtitle(`terminará ${distance}`);
    }
  }, [ close, now, start, end, setSubtitle, eventState ]);

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        margin: 40px 10px;
        `}
      >
      <div css="display: flex">
        <Link to="/" css={'width: 60px'}>← atrás</Link>
        <div
          css={`
            display: flex;
            justify-content: center;
            font-size: 32px;
            flex-grow: 1;
            text-align: center;
            `}
          >
          {text}
        </div>
        <div css={'width: 60px'}/>
      </div>
      <div
        css={`
          align-self: center;
          `}
        >
        {subtitle}
      </div>
    </div>
  );
}

export default Event;
