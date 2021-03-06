import React, { useContext, useEffect, useState, } from 'react';
import { environment, sleep, } from './helpers';
import settings from '../settings.json';
import { useT } from './i18n';
import { AccountContext, BackendContext, } from './coinosis';
import { eventStates, } from './event';

const Meet = ({
  id,
  eventName,
  userName,
  setJitsters,
  eventState,
  streamName,
  streamID,
}) => {

  const t = useT();
  const { language } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const [ api, setAPI, ] = useState();
  const [ loaded, setLoaded, ] = useState(false);
  const [ streamStatus, setStreamStatus, ] = useState();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = './jitsi.js';
    script.async = false;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    }
  }, []);

  useEffect(() => {
    if (!id || !userName || !window.JitsiMeetExternalAPI) return;
    const options = {
      roomName: `${ id }-${ settings[environment].id }`,
      width: '100%',
      height: '800px',
      parentNode: document.getElementById('jitsi'),
      configOverwrite: {
        prejoinPageEnabled: false,
        startAudioOnly: !settings[environment].jitsi.video,
        startWithAudioMuted: !settings[environment].jitsi.audio,
        fileRecordingsEnabled: false,
        remoteVideoMenu: {
          disableKick: true,
        },
        defaultLanguage: language,
      },
      interfaceConfigOverwrite: {
        DEFAULT_BACKGROUND: '#476047',
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'desktop',
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
      },
      noSSL: false,
      onload: () => { setLoaded(true); },
      userInfo: {
        displayName: userName,
      }
    };
    setAPI(prev => {
      if (prev) return prev;
      return new window.JitsiMeetExternalAPI('meet.jit.si', options);
    });
  }, [ id, setAPI, userName, setLoaded, window.JitsiMeetExternalAPI, ]);

  useEffect(() => {
    if (!loaded) return;
    api.executeCommand('displayName', userName);
  }, [ loaded, api, userName, ]);

  useEffect(() => {
    if (!backendURL || !streamID) return;
    const getStatus = async () => {
      while (true) {
        const query = `${ backendURL }/youtube/stream/${ streamID }`;
        const response = await fetch(query);
        const status = await response.json();
        setStreamStatus(status);
        await sleep(3000);
      }
    }
    getStatus();
  }, [ backendURL, streamID, setStreamStatus, sleep, ]);

  useEffect(() => {
    if (!loaded || !streamStatus) return;
    if (eventState >= eventStates.EVENT_STARTED
        && eventState < eventStates.EVENT_ENDED
        && streamStatus !== 'active') {
      setTimeout(() => {
        console.log('starting stream...');
        api.executeCommand('startRecording', {
          mode: 'stream',
          youtubeStreamKey: streamName,
        });
      }, 5000);
    }
  }, [ loaded, streamStatus, eventState, api, streamName, ]);

  useEffect(() => {
    if (!loaded) return;
    if (eventState >= eventStates.EVENT_ENDED) {
      setTimeout(() => {
        console.log('stopping stream...');
        api.executeCommand('stopRecording', 'stream');
      }, 5000);
    }
  }, [ loaded, eventState, api, ])

  useEffect(() => {
    if (!loaded) return;
    api.executeCommand('subject', eventName);
  }, [ loaded, api, eventName, ]);

  useEffect(() => {
    if (!loaded) return;
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
    api.on('displayNameChange', jitster => {
      setJitsters(prev => {
        if (!prev) return prev;
        const index = prev.findIndex(j => j.id === jitster.id);
        if (index === -1) return prev;
        const record = prev[index];
        if (record.displayName.startsWith('0x')) {
          const next = [ ...prev ];
          next[index].displayName = jitster.displayname;
          return next;
        } else return prev;
      });
    });
    api.on('videoConferenceLeft', () => {
      api.dispose();
    });
  }, [ loaded, api, setJitsters, ]);

  return (
    <div
      css={`
        width: 100%;
        height: 800px;
      `}
    >
      { settings[environment].jitsi.enabled && (
        <div id="jitsi" />
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
