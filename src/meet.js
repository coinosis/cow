import React, { useCallback, useState } from 'react';
import Jitsi from 'react-jitsi';
import { format } from 'date-fns';
import { environment, Loading } from './helpers';
import settings from '../settings.json';

const Meet = ({
  id,
  account,
  userName,
  users,
  setUsers,
  beforeStart,
  afterEnd,
}) => {

  const [now] = useState(new Date());

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

    API.executeCommand('subject', ' ');

    API.on('videoConferenceJoined', jitster  => {
      participantChanged(jitster, { present: true });
    });

    API.on('participantJoined', jitster => {
      participantChanged(jitster, { present: true });
    });

    API.on('dominantSpeakerChanged', jitster => {
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
      participantChanged(jitster, {});
    });

    API.on('participantLeft', jitster => {
      participantChanged(jitster, { present: false });
    });

    API.on('videoConferenceLeft', () => {
      API.dispose();
    });

  }, []);

  if (
    userName === undefined
      || users === undefined
      || account === undefined
      || beforeStart === undefined
      || afterEnd === undefined
  ) return <div/>

  if (userName === null || !users.map(a => a.address).includes(account))
    return <div/>

  if (now < beforeStart) return (
    <div>
      {format(
        beforeStart,
        "'la videoconferencia comenzará el' dd 'de' MMMM 'de' yyyy 'a las' "
        + "h:mm aa"
      )}
    </div>
  );

  if (now > afterEnd) return (
    <div>
      {format(
        afterEnd,
        "'la videoconferencia finalizó el' dd 'de' MMMM 'de' yyyy 'a las' "
        + "h:mm aa"
      )}
    </div>
  );

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
        <a css="margin: 5px" href="webrtc.html" target="_blank">aquí</a>.
      </div>
      { settings[environment].jitsi && (
        <Jitsi
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
