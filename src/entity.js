import React, { useContext, useEffect, useState, } from 'react';
import { useParams, } from 'react-router-dom';
import { BackendContext, } from './coinosis';
import { Loading, convertDates, } from './helpers';
import { useT, } from './i18n';
import Event from './event';
import Series from './course';

export const entityTypes = {
  EVENT: Symbol('EVENT'),
  SERIES: Symbol('SERIES'),
}

const Entity = () => {

  const { url } = useParams();
  const backendURL = useContext(BackendContext);
  const [ entity, setEntity, ] = useState();
  const [ entityType, setEntityType, ] = useState();
  const t = useT();

  useEffect(() => {
    setEntity();
    const getEntity = async () => {
      const eventResponse = await fetch(`${ backendURL }/event/${ url }`);
      if (eventResponse.ok) {
        const event = await eventResponse.json();
        const eventWithDates = convertDates(event);
        setEntityType(entityTypes.EVENT);
        setEntity(eventWithDates);
        return;
      }
      const seriesResponse = await fetch(`${ backendURL }/series/${ url }`);
      if (seriesResponse.ok) {
        const series = await seriesResponse.json();
        setEntityType(entityTypes.SERIES);
        setEntity(series);
        return;
      }
      setEntity(null);
    }
    getEntity();
  }, [ backendURL, url, setEntity, setEntityType, ]);

  if (entity === undefined) {
    return <Loading/>
  }

  if (entityType === entityTypes.EVENT) {
    return (
      <Event event={entity} />
    );
  }

  if (entityType === entityTypes.SERIES) {
    return (
      <Series series={entity} />
    );
  }

  return (
    <div>{ t('not_found') }</div>
  );
}

export default Entity;
