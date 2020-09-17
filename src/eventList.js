import React, { useContext, useEffect, useState } from 'react';
import { AccountContext, BackendContext } from './coinosis';
import { Link, SectionTitle } from './helpers';
import AddEvent from './addEvent';
import { useT, useFormatDate, } from './i18n';

export const eventTypes = {
  EVENT: Symbol('EVENT'),
  COURSE: Symbol('COURSE'),
};

const EventList = () => {

  const { name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [events, setEvents] = useState([]);
  const [ courses, setCourses, ] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [past, setPast] = useState([]);
  const [ eventType, setEventType, ] = useState();
  const t = useT();

  useEffect(() => {
    if (!backendURL) return;
    const getCourses = async () => {
      const response = await fetch(`${backendURL}/courses`);
      if (!response.ok) throw new Error(response);
      const data = await response.json();
      setCourses(data);
    }
    getCourses();
  }, [ backendURL, ]);

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
      }).catch(() => {
        setEvents([]);
      });
  }, [ backendURL, ]);

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
        title={t('events_happening_now')}
        events={live}
      />
      <EventSection
        title={t('upcoming_events')}
        events={upcoming}
      />
      { name && (
        <div
          css={`
          display: flex;
          flex-direction: column;
          align-items: center;
        `}
        >
          <SectionTitle>
            { t('create_new_event') }
          </SectionTitle>
          <div css="margin-bottom: 25px;">
            <button
              css="margin-right: 15px;"
              disabled={ eventType === eventTypes.EVENT }
              onClick={ () => setEventType(eventTypes.EVENT) }
            >
              { t('new_event') }
            </button>
            <button
              disabled={ eventType === eventTypes.COURSE }
              onClick={ () => setEventType(eventTypes.COURSE) }
            >
              { t('new_course') }
            </button>
          </div>
        { eventType === eventTypes.EVENT ? (
          <AddEvent
            eventType={ eventTypes.EVENT }
            setEvents={ setEvents }
          />
        ) : eventType === eventTypes.COURSE ? (
          <AddEvent
            eventType={ eventTypes.COURSE }
            setCourses={ setCourses }
            events={ events }
            courses={ courses }
          />
        ) : (
          <div/>
        ) }
        </div>
      )}
      <EventSection
        title={t('past_events')}
        events={past}
      />
    </div>
  );
}

const EventSection = ({ title, events }) => {

  const formatDate = useFormatDate();

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
