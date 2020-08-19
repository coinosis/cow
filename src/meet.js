import React, { useCallback } from 'react';
import Jitsi from 'react-jitsi';
import { environment, Loading } from './helpers';
import settings from '../settings.json';

const Meet = ({
  id,
  eventName,
  userName,
  setJitsters,
}) => {

  const handleAPI = useCallback(API => {

    API.executeCommand('subject', eventName);

    API.on('videoConferenceJoined', me  => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return [ me ];
        return [ ...prevJitsters, me ];
      });
    });

    API.on('participantJoined', jitster => {
      setJitsters(prevJitsters => {
        if (!prevJitsters) return [ jitster ];
        return [ ...prevJitsters, jitster ];
      });
    });

    API.on('dominantSpeakerChanged', ({ id }) => {
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

    API.on('participantLeft', ({ id }) => {
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

    API.on('subjectChange', ({ subject }) => {
      if (subject !== eventName) {
        API.executeCommand('subject', eventName);
      }
    });

    API.on('videoConferenceLeft', () => {
      API.dispose();
    });

  }, [ eventName ]);

  return (
    <div
      css={`
        width: 100%;
        height: 800px;
      `}
    >
      <div
        css={`
          text-align: right;
        `}
      >
      ¿Tienes problemas con el audio y el video? Haz clic
        <a css="margin: 5px" href="/webrtc.html" target="_blank">aquí</a>.
      </div>
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
            marginBottom: '20px',
          }}
          config={{
            prejoinPageEnabled: false,
            startAudioOnly: !settings[environment].jitsi.video,
            startWithAudioMuted: true,
            fileRecordingsEnabled: false,
            remoteVideoMenu: {
              disableKick: true,
            },
          }}
          interfaceConfig={{
            DEFAULT_BACKGROUND: '#476047',
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'chat',
              'livestreaming',
              'raisehand',
              'videoquality',
              'stats',
              'shortcuts',
              'tileview',
              'mute-everyone',
              'settings',
              'fullscreen',
            ],
            SETTINGS_SECTIONS: ['language'],
            SHOW_CHROME_EXTENSION_BANNER: false,
            ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 15000,
          }}
        />
      )}
    </div>
  );
}

export default Meet
