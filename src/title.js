import React, { useEffect, useState, } from 'react';
import { Big, Link, } from './helpers';
import { differenceInDays, formatDistance } from 'date-fns'
import { useT, useLocale, } from './i18n';
import { eventStates } from './event';

const Title = ({ text, now, start, end, eventState, backURL, backName, }) => {

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
        <Link
          to={ backURL }
          css={`width: 33.33%;`}
        >
          ← { backName }
        </Link>
        <Big>
          {text}
        </Big>
        <div css={`width: 33.33%;`}/>
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

export default Title;
