import React, { useCallback, useContext, useEffect, useState } from 'react';
import { AccountContext, BackendContext } from './coinosis';
import { Link, formatDate, SectionTitle } from './helpers';
import AddEvent from './addEvent';

const EventList = () => {

  const { account } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [past, setPast] = useState([]);

  useEffect(() => {
    if (!backendURL) return;
    fetch(`${backendURL}/events`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        }
        return response.json();
      }).then(data => {
        const events = data.map(event => {
          return {
            startDate: new Date(event.start),
            endDate: new Date(event.end),
            ...event,
          };
        });
        const sortedEvents = events.sort((a, b) => {
          return b.startDate - a.startDate;
        });
        setEvents(sortedEvents);
      }).catch(err => {
        setEvents([]);
      });
  }, []);

  useEffect(() => {
    const now = new Date();
    const upcoming = events.filter(event => now < event.startDate);
    const live = events.filter(event =>
      now >= event.startDate
        && now <= event.endDate
    );
    const past = events.filter(event => now > event.endDate);
    setUpcoming(upcoming);
    setLive(live);
    setPast(past);
  }, [events]);

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
          display: flex;
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
        <table>
          <tbody>
            {events.map(event => {
              return (
                <tr key={event._id}>
                  <td>
                    <Link to={event.url}>
                      {event.name}
                    </Link>
                  </td>
                  <td>
                    {formatDate(event.startDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventList;
