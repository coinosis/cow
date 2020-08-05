import React, { useCallback } from 'react';
import Jitsi from 'react-jitsi';
import { environment, Loading } from './helpers';
import settings from '../settings.json';

const Meet = ({
  id,
  eventName,
  userName,
  setUsers,
}) => {

  const participantChanged = useCallback((jitster, change) => {
    setUsers(prevUsers => {
      if (!prevUsers) return prevUsers;
      const nextUsers = [ ...prevUsers ];
      let index = nextUsers.findIndex(user => user.id === jitster.id);
      if (index === -1 && jitster.displayName) {
        index = nextUsers.findIndex(user => user.name === jitster.displayName);
      }
      if (index === -1) return prevUsers;
      let joinedAttendee = {...nextUsers[index], ...jitster, ...change};
      nextUsers[index] = joinedAttendee;
      return nextUsers;
    });
  }, []);

  const handleAPI = useCallback(API => {

    API.executeCommand('subject', eventName);

    API.on('videoConferenceJoined', jitster  => {
      API.executeCommand('subject', eventName);
      participantChanged(jitster, { present: true });
    });

    API.on('participantJoined', jitster => {
      API.executeCommand('subject', eventName);
      participantChanged(jitster, { present: true });
    });

    API.on('dominantSpeakerChanged', jitster => {
      API.executeCommand('subject', eventName);
      setUsers(prevUsers => {
        const nextUsers = [ ...prevUsers ];
        const index = nextUsers.findIndex(a => a.speaker);
        if (index === -1) return prevUsers;
        nextUsers[index].speaker = false;
        return nextUsers;
      });
      participantChanged(jitster, { speaker: true });
    });

    API.on('displayNameChange', jitster => {
      API.executeCommand('subject', eventName);
      participantChanged(jitster, {});
    });

    API.on('participantLeft', jitster => {
      API.executeCommand('subject', eventName);
      participantChanged(jitster, { present: false });
    });

    API.on('videoConferenceLeft', () => {
      API.executeCommand('subject', eventName);
      API.dispose();
    });

  }, []);

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
