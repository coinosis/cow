import React, { useContext, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AccountContext, BackendContext } from './coinosis';
import { Link } from './helpers';
import AddEvent from './addEvent';

const privilegedAccounts = [
  '0xeFaC568c637201ea0A944b888b8FB98386eF2882',
  '0xfE1d177037DF1ABbdde4c0E4AFcdE9447F8511D0',
  '0x51e9047a6bBEC3c2a4C03c27382381B129e99e0E',
  '0xbED9793fC4FEe638805464A16c11ef642e16974D',
];

const EventList = () => {

  const { account } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [past, setPast] = useState([]);
  const [showAddEvent, setShowAddEvent] = useState(false);

  useEffect(() => {
    if (!backendURL) return;
    fetch(`${backendURL}/events`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        }
        return response.json();
      }).then(data => {
        setEvents(data);
      }).catch(err => {
        setEvents([]);
      });
  }, []);

  useEffect(() => {
    const now = new Date();
    const upcoming = events.filter(event => now < new Date(event.start));
    const live = events.filter(event =>
      now >= new Date(event.start) && now <= new Date(event.end)
    );
    const past = events.filter(event => now > new Date(event.end));
    setUpcoming(upcoming);
    setLive(live);
    setPast(past);
  }, [events]);

  useEffect(() => {
    if (privilegedAccounts.includes(account)) {
      setShowAddEvent(true);
    }
    else {
      setShowAddEvent(false);
    }
  }, [account]);

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      <EventSection
        title="eventos sucediendo en este momento"
        events={live}
      />
      <EventSection
        title="próximos eventos"
        events={upcoming}
      />
      <div
        css={`
          display: ${showAddEvent ? 'flex' : 'none'};
          flex-direction: column;
          align-items: center;
        `}
      >
        <SectionTitle>
          crea un nuevo evento
        </SectionTitle>
        <AddEvent setEvents={setEvents} />
    </div>
      <EventSection
        title="eventos pasados"
        events={past}
      />
    </div>
  );
}

const EventSection = ({ title, events }) => {
  return (
    <div
      css={`
        display: ${events.length ? 'flex' : 'none'};
        flex-direction: column;
        align-items: center;
      `}
    >
      <SectionTitle>
        {title}
      </SectionTitle>
      <div
        css={`
          display: flex;
          flex-direction: column;
          align-items: center;
          font-size: 18px;
        `}
      >
        {events
         .map(event => {
           return (
             <div key={event._id}>
               <Link to={event.url}>
                 {event.name}
               </Link>
             </div>
           );
         })}
      </div>
    </div>
  );
}

const SectionTitle = styled.div`
  font-size: 30px;
  margin-top: 70px;
  margin-bottom: 15px;
`

export default EventList;
