import React, { useContext, useEffect, useState, } from 'react';
import { useParams, } from 'react-router-dom';
import { BackendContext, } from './coinosis';
import { Loading, convertDates, } from './helpers';
import { useT, } from './i18n';
import Event from './event';
import Course from './course';

export const entityTypes = {
  EVENT: Symbol('EVENT'),
  COURSE: Symbol('COURSE'),
}

const Entity = () => {

  const { url } = useParams();
  const backendURL = useContext(BackendContext);
  const [ entity, setEntity, ] = useState();
  const [ entityType, setEntityType, ] = useState();
  const t = useT();

  useEffect(() => {
    const getEntity = async () => {
      const eventResponse = await fetch(`${ backendURL }/event/${ url }`);
      if (eventResponse.ok) {
        const event = await eventResponse.json();
        const eventWithDates = convertDates(event);
        setEntity(eventWithDates);
        setEntityType(entityTypes.EVENT);
        return;
      }
      const courseResponse = await fetch(`${ backendURL }/course/${ url }`);
      if (courseResponse.ok) {
        const course = await courseResponse.json();
        setEntity(course);
        setEntityType(entityTypes.COURSE);
        return;
      }
      setEntity(null);
    }
    getEntity();
  }, [ backendURL, url, ]);

  if (entity === undefined) {
    return <Loading/>
  }

  if (entityType === entityTypes.EVENT) {
    return (
      <Event event={entity} />
    );
  }

  if (entityType === entityTypes.COURSE) {
    return (
      <Course course={entity} />
    );
  }

  return (
    <div>{ t('not_found') }</div>
  );
}

export default Entity;
