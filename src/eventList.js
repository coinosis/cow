import React, { useContext, useEffect, useState } from 'react';
import { Button, Card, Heading } from "rimble-ui";
import { AccountContext, BackendContext } from './coinosis';
import { Link } from './helpers';
import AddEvent from './addEvent';
import { useT, useFormatDate, } from './i18n';
import { entityTypes } from './entity';

const EventList = () => {

  const { name } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [events, setEvents] = useState([]);
  const [ series, setSeries, ] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [live, setLive] = useState([]);
  const [past, setPast] = useState([]);
  const [ eventType, setEventType, ] = useState();
  const t = useT();

  useEffect(() => {
    if (!backendURL) return;
    const getSeries = async () => {
      const response = await fetch(`${backendURL}/series`);
      if (!response.ok) throw new Error(response);
      const data = await response.json();
      setSeries(data);
    }
    getSeries();
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
        series={ series }
      />
      <EventSection
        title={t('upcoming_events')}
        events={upcoming}
        series={ series }
      />
      { name && (
        <div
          css={`
          display: flex;
          flex-direction: column;
          align-items: center;
        `}
        >
          <Heading as = {"h1"} >
            { t('create_new_event') }
          </Heading>
          <div css="margin-bottom: 25px;">
            <Button mainColor="DarkCyan"
              css="margin-right: 15px;"
              disabled={ eventType === entityTypes.EVENT }
              onClick={ () => setEventType(entityTypes.EVENT) }
            >
              { t('new_event') }
            </Button>
            <Button.Outline mainColor="DarkCyan"
              disabled={ eventType === entityTypes.SERIES }
              onClick={ () => setEventType(entityTypes.SERIES) }
            >
              { t('new_series') }
            </Button.Outline>
          </div>
        { eventType === entityTypes.EVENT ? (
          <AddEvent
            eventType={ entityTypes.EVENT }
            setEvents={ setEvents }
          />
        ) : eventType === entityTypes.SERIES ? (
          <AddEvent
            eventType={ entityTypes.SERIES }
            setSeries={ setSeries }
            events={ events }
            series={ series }
          />
        ) : (
          <div/>
        ) }
        </div>
      )}
      <Card>
        <EventSection
          title={t('past_events')}
          events={past}
          series={ series }
        />
      </Card>
    </div>
  );
}

const EventSection = ({ title, events, series, }) => {

  const formatDate = useFormatDate();

  return (
    <div
      css={`
        display: ${events.length ? 'flex' : 'none'};
        flex-direction: column;
        align-items: center;
      `}
    >
      <Heading as={"h1"}>
        {title}
      </Heading>
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
              const aSeries = series.find(aSeries =>
                aSeries.events.includes(event.url)
              );
              return (
                <tr key={event._id}>
                  <td>
                    { aSeries && (
                      <Link to={ aSeries.url } css="color: #004000;">
                        [{ aSeries.name }]
                      </Link>
                    ) }
                    <Link to={ event.url }>
                      { event.name }
                    </Link>
                  </td>
                  <td>
                    { formatDate(event.startDate) }
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
