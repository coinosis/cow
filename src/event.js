import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
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
import { useT, useLocale, } from './i18n';

export const eventStates = {
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
  const [signature, setSignature] = useState();
  const [attendeeAddresses, setAttendeeAddresses] = useState();
  const [attendees, setAttendees] = useState();
  const [jitsters, setJitsters] = useState();
  const [eventState, setEventState] = useState();
  const [userState, setUserState] = useState();
  const [contractState, setContractState] = useState();
  const [attending, setAttending] = useState(false);
  const [inEvent, setInEvent] = useState();
  const [ownClaps, setOwnClaps] = useState();
  const [reward, setReward] = useState();
  const [now, setNow] = useState(new Date());
  const getUser = useGetUser();
  const t = useT();

  useEffect(() => {
    const time = setInterval(() => { setNow(new Date()); }, 3000);
    return () => {
      clearInterval(time);
    }
  }, [ setNow ]);

  const getClaps = useCallback(async () => {
    if (!event) return;
    const response = await fetch(`${backendURL}/claps/${event.url}/${account}`);
    const claps = await response.json();
    setOwnClaps(claps);
  }, [ backendURL, event, account, setOwnClaps ]);

  useEffect(() => {
    const clapInterval = setInterval(getClaps, 3000);
    return () => {
      clearInterval(clapInterval);
    }
  }, [ getClaps ]);

  const attend = useCallback(async () => {
    const object = { event: event.url, user: account, };
    const payload = JSON.stringify(object);
    const hex = web3.utils.utf8ToHex(payload);
    const signature = await web3.eth.personal.sign(hex, account);
    setSignature(signature);
    setAttending(true);
  }, [ event, web3, account, setSignature, setAttending, ]);

  useEffect(() => {
    if (
      contractState === contractStates.DISTRIBUTION_MADE
        && eventState === eventStates.CALL_ENDED
    ) {
      setAttending(false);
    }
  }, [ contractState, eventState, setAttending, ]);

  useEffect(() => {
    if (eventState === undefined || attending === undefined) return;
    const eventOngoing = eventState >= eventStates.EVENT_STARTED
          && eventState < eventStates.EVENT_ENDED;
    setInEvent(attending && eventOngoing);
  }, [ eventState, attending, ]);

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
    const userState = Number(await contract.methods.states(account).call());
    setUserState(userState);
  }, [ contract, account, setUserState, setReward, attending, ]);

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

  const getAttendeeAddresses = useCallback(async () => {
    if (!contract) return;
    const addresses = await contract.methods.getAttendees().call();
    setAttendeeAddresses(prev => {
      if (!addresses || !addresses.length) return [];
      if (prev && prev.length === addresses.length) return prev;
      return addresses;
    });
  }, [ contract, setAttendeeAddresses ]);

  useEffect(() => {
    getAttendeeAddresses();
    const updateAttendees = setInterval(getAttendeeAddresses, 3000);
    return () => {
      clearInterval(updateAttendees);
    }
  }, [ getAttendeeAddresses ]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (
        !attendeeAddresses
          || !attendeeAddresses.length
          || (attendees && attendees.length === attendeeAddresses.length)
      ) {
        setAttendees([]);
        return;
      }
      const nextAttendees = attendees ? [ ...attendees ] : [];
      for (const address of attendeeAddresses) {
        if (nextAttendees.map(a => a.address).includes(address)) continue;
        const attendee = await getUser(address);
        nextAttendees.push(attendee);
      }
      setAttendees(nextAttendees);
    };
    fetchUsers();
  }, [ attendeeAddresses, setAttendees ]);

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
          setEventState(eventStates.CALL_ENDED);
          setUserState(userStates.UNREGISTERED); // TODO
          setContractState(contractStates.DISTRIBUTION_MADE);
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
        <Info event={event} />
        <div
          css={`
            display: flex;
            justify-content: center;
          `}
        >
          <Account large={true} />
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
        <Info event={event} />
        <NoContract currency={event.currency} />
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
             && eventState < eventStates.EVENT_ABOUT_TO_END))
        && (
          <Attendance
            eventName={event.name}
            event={event.url}
            fee={event.fee}
            feeWei={event.feeWei}
            userState={userState}
            contractAddress={event.address}
            currency={event.currency}
          />
        ) }
      { userState >= userStates.REGISTERED && !attending
        && eventState >= eventStates.CALL_STARTED
        && contractState < contractStates.DISTRIBUTION_MADE
        && (
          <div
            css={`
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 260px;
            `}
          >
            <button
              css={`
                padding: 10px;
                font-size: 20px;
              `}
              onClick={attend}
            >
              { t('join_call') }
            </button>
          </div>
        ) }
      { !attending && (
        <Info
          event={event}
          userState={userState}
          eventState={eventState}
        />
      ) }
      { contractState === contractStates.DISTRIBUTION_MADE && (
        <Result url={event.url} currency={event.currency} />
      ) }
      <div css="display: flex">
        { userState >= userStates.REGISTERED && attending
          && eventState >= eventStates.EVENT_STARTED
          && contractState < contractStates.DISTRIBUTION_MADE
          && (
            <div
              css={`
                display: flex;
                flex-direction: column;
              `}
            >
              <div
                css={`
                  display: flex;
                  justify-content: center;
                  font-size: 20px;
                  margin-bottom: 30px;
                  flex-direction: column;
                  align-items: center;
                `}
              >
                <div
                  css={`
                      font-size: 80px;
                    `}
                >
                  {ownClaps}
                </div>
                { t('claps_received') }
              </div>
              <Assessment
                state={userState}
                setState={setUserState}
                updateState={updateUserState}
                url={event.url}
                attendees={attendees}
                jitsters={jitsters}
                currency={event.currency}
                signature={signature}
              />
              <Distribute
                eventURL={event.url}
                end={event.end}
                state={userState}
                updateState={updateUserState}
                reward={reward}
                currency={event.currency}
              />
            </div>
          ) }
        { userState >= userStates.REGISTERED && attending
          && eventState >= eventStates.CALL_STARTED
          && (contractState < contractStates.DISTRIBUTION_MADE
              || eventState < eventStates.CALL_ENDED)
          && (
            <Meet
              id={event._id}
              eventName={event.name}
              userName={userName}
              jitsters={jitsters}
              setJitsters={setJitsters}
              eventState={ eventState }
              streamName={ event.streamName }
            />
          ) }
      </div>
      <Footer hidden={event.version < 2} currency={event.currency} />
    </ContractContext.Provider>
  );
}

const Info = ({ event, userState, eventState }) => {
  const t = useT();
  return (
    <div>
      { event.broadcastID && (
      <div
        css={`
            display: flex;
            flex-direction: column;
            align-items: center;
          `}
      >
        <div
          css={`
              margin-top: 50px;
              display: flex;
              justify-content: center;
            `}
        >
          { userState === userStates.UNREGISTERED
            && eventState < eventStates.EVENT_ABOUT_TO_END
            && t('dont_want_to_participate') }
          <a
            css={`
                margin: 0 5px;
                color: black;
                &:visited {
                  color: black;
                }
              `}
            href={`https://youtu.be/${ event.broadcastID }`}
            target="_blank"
            rel="noreferrer"
          >
            { t('watch_on_youtube') }
          </a>
          { userState === userStates.UNREGISTERED
            && eventState < eventStates.EVENT_ABOUT_TO_END
            && t('at_no_cost') }
        </div>
        <iframe
          width="560"
          height="315"
          src={`https://www.youtube.com/embed/${ event.broadcastID }`}
          frameBorder="0"
          allow={'accelerometer; autoplay; encrypted-media; gyroscope; '
                 + 'picture-in-picture'}
          allowFullScreen
        >
        </iframe>
      </div>
      ) }
      <div
        css={`
          margin: 20px;
          background: #f8f8f8;
          padding: 10px;
          border-radius: 4px;
          border: 1px solid #e8e8e8;
          box-shadow: 1px 1px #e8e8e8;
        `}
      >
        <Markdown
          source={ event.description }
          linkTarget="_blank"
        />
      </div>
    </div>
  );
}

const Title = ({ text, now, start, end, eventState }) => {

  const [close, setClose] = useState();
  const [subtitle, setSubtitle] = useState();
  const t = useT();
  const locale = useLocale();

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
    const dateOptions = { locale, addSuffix: true, includeSeconds: true, };
    if (close === false) {
      setSubtitle(start.toLocaleString());
    } else if (eventState >= eventStates.EVENT_ENDED) {
      const distance = formatDistance(end, now, dateOptions);
      setSubtitle(`${t('ended')} ${distance}`);
    } else if (eventState < eventStates.EVENT_STARTED) {
      const distance = formatDistance(start, now, dateOptions);
      setSubtitle(`${t('will_start')} ${distance}`);
    } else if (eventState === eventStates.EVENT_STARTED) {
      const distance = formatDistance(start, now, dateOptions);
      setSubtitle(`${t('started')} ${distance}`);
    } else if (eventState === eventStates.EVENT_HALFWAY_THROUGH) {
      const distance = formatDistance(end, now, dateOptions);
      setSubtitle(`${t('will_end')} ${distance}`);
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
        <Link to="/" css={'width: 60px'}>← {t('back')}</Link>
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
