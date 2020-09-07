import React, { useCallback, useContext, useEffect, useState, } from 'react';
import Jitsi from 'react-jitsi';
import { environment, Loading } from './helpers';
import settings from '../settings.json';
import { useT } from './i18n';
import { AccountContext } from './coinosis';
import { eventStates, } from './event';

const Meet = ({
  id,
  eventName,
  userName,
  jitsters,
  setJitsters,
  eventState,
  streamName,
}) => {

  const t = useT();
  const { language } = useContext(AccountContext);
  const [ api, setAPI ] = useState();

  useEffect(() => {
    if (!jitsters || !jitsters[0]) return;
    if (eventState === eventStates.EVENT_STARTED) {
      if (jitsters[0].displayName === userName) {
        api.executeCommand('startRecording', {
          mode: 'stream',
          youtubeStreamKey: streamName,
        });
        jitsters[0].streamer = true;
      }
    }
  }, [ jitsters, eventState, userName, api, ]);

  useEffect(() => {
    if (eventState === eventStates.EVENT_ENDED) {
      api.executeCommand('stopRecording', 'stream');
    }
  }, [ eventState, api, ])

  const handleAPI = useCallback(api => {

    setAPI(api);
    api.executeCommand('subject', eventName);

    api.on('videoConferenceJoined', me  => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return [ me ];
        return [ ...prevJitsters, me ];
      });
    });

    api.on('participantJoined', jitster => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return [ jitster ];
        return [ ...prevJitsters, jitster ];
      });
    });

    api.on('dominantSpeakerChanged', ({ id }) => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return prevJitsters;
        const nextJitsters = [ ...prevJitsters ];
        const prevSpeaker = nextJitsters.findIndex(j => j.speaker);
        if (prevSpeaker !== -1) {
          nextJitsters[prevSpeaker].speaker = false;
        }
        const nextSpeaker = nextJitsters.findIndex(j => j.id === id);
        if (nextSpeaker !== -1) {
          nextJitsters[nextSpeaker].speaker = true;
        } else {
          console.log(`next speaker ${id} not found in`, nextJitsters);
        }
        return nextJitsters;
      });
    });

    api.on('participantLeft', ({ id }) => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return prevJitsters;
        const nextJitsters = [ ...prevJitsters ];
        const index = nextJitsters.findIndex(j => j.id === id);
        if (index !== -1) {
          nextJitsters.splice(index, 1);
        } else {
          console.log(`leaving jitster ${id} not found in`, nextJitsters);
        }
        return nextJitsters;
      });
    });

    api.on('videoConferenceLeft', () => {
      api.dispose();
    });

  }, [ setAPI, eventName, setJitsters, ]);

  return (
    <div
      css={`
        width: 100%;
        height: 800px;
      `}
    >
      { settings[environment].jitsi.enabled && (
        <Jitsi
          domain="meet.jit.si"
          roomName={`${id}-${settings[environment].id}`}
          displayName={userName}
          userInfo={{ displayName: userName }}
          noSSL={false}
          loadingComponent={Loading}
          onAPILoad={handleAPI}
          containerStyle={{
            width: '100%',
            height: '800px',
          }}
          config={{
            prejoinPageEnabled: false,
            startAudioOnly: !settings[environment].jitsi.video,
            startWithAudioMuted: false,
            fileRecordingsEnabled: false,
            remoteVideoMenu: {
              disableKick: true,
            },
            defaultLanguage: language,
          }}
          interfaceConfig={{
            DEFAULT_BACKGROUND: '#476047',
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'chat',
              'raisehand',
              'videoquality',
              'tileview',
              'settings',
              'fullscreen',
            ],
            SETTINGS_SECTIONS: [ 'language', ],
            SHOW_CHROME_EXTENSION_BANNER: false,
            ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 5000,
            LANG_DETECTION: false,
          }}
        />
      )}
      <div
        css={`
          text-align: right;
          margin-bottom: 20px;
        `}
      >
        { t('jitsi_troubleshooting') }
        <a
          css={`
            margin: 5px;
            color: black;
            &:visited {
              color: black;
            }
          `}
          href={`/webrtc-${ language }.html`}
          target="_blank"
          rel="noreferrer"
        >
          { t('here') }
        </a>.
      </div>
    </div>
  );
}

export default Meet
