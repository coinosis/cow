import React from 'react';
import Markdown from 'react-markdown';
import { eventStates, userStates, } from './event';
import { useT, } from './i18n';
import { Card, } from './helpers';

const EventInfo = ({ event, userState, eventState }) => {
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
    { event.presentation && (
      <Card>{ `${ t('presentation_link') }: ${ event.presentation }` }</Card>
    ) }
      <Card>
        <Markdown
          source={ event.description }
          linkTarget="_blank"
        />
      </Card>
    </div>
  );
}

export default EventInfo;
