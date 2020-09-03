import React, { useCallback, useContext, useEffect, useState } from 'react';
import Box from '3box';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { Loading, ExternalLink, sleep } from './helpers.js';
import unlockNifty from './assets/unlockNifty.gif';
import { useT } from './i18n';
import loadingIcon from './assets/loading.gif';

const Account = ({ large }) => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const {
    account,
    setAccount,
    name,
    setName,
    box,
    setBox,
    setProfile,
    unsavedData,
    awaitingReload,
    setAwaitingReload,
  } = useContext(AccountContext);
  const [unsavedName, setUnsavedName] = useState('');
  const t = useT();
  const [ hasBox, setHasBox ] = useState();
  const [ hasLegacy, setHasLegacy ] = useState();
  const [ signingUp, setSigningUp ] = useState();
  const [ syncing, setSyncing ] = useState();

  const updateBox = useCallback(async account => {
    if (!box) return;
    const isLinked = box._3idEthAddress === account.toLowerCase();
    if (!isLinked) {
      await box.logout();
      setBox(null);
      setUnsavedName('');
      console.log('logged out');
    }
  }, [ box, setBox, ]);

  const updateAccounts = useCallback(async _accounts => {
    const accounts = _accounts || await web3.eth.getAccounts();
    if (accounts.length) {
      setAccount(prev => {
        if (!prev) return accounts[0];
        if (accounts[0] === prev) return prev;
        return accounts[0];
      });
      await getAccountStatus(accounts[0]);
      await updateBox(accounts[0]);
    } else {
      setAccount(null);
      setName(null);
      setHasBox(false);
    }
  }, [ web3, setAccount, setName, getAccountStatus, updateBox, ]);

  useEffect(() => {
    updateAccounts();
    window.ethereum.on('accountsChanged', updateAccounts);
  }, [ updateAccounts, ]);

  const getLegacyName = useCallback(async () => {
    if(!backendURL || !account) return null;
    const response = await fetch(`${backendURL}/user/${account}`);
    if (!response.ok) {
      return null;
    }
    try {
      const data = await response.json();
      return data.name;
    } catch (err) {
      return null;
    }
  }, [ account, backendURL, ]);

  const openBox = useCallback(async name => {
    setSyncing(true);
    if (!account) return null;
    const box = await Box.openBox(account, web3.givenProvider);
    if (name) await box.public.set('name', name);
    setBox(box);
    return box;
  }, [ setSyncing, account, web3, setBox, ]);

  const signup = useCallback(async name => {
    setSigningUp(true);
    openBox(name);
    setProfile(await Box.getProfile(account));
  }, [ openBox, setSigningUp, account, ]);

  const getAccountStatus = useCallback(async account => {
    if (!account) return;
    const profile = await Box.getProfile(account);
    if (Object.keys(profile).length) {
      setHasBox(true);
      setSigningUp(false);
      setSyncing(false);
      if (profile.name) {
        setName(profile.name);
      } else {
        setName(null);
      }
      setProfile(prev => {
        if (!prev) return profile;
        if (prev.language === profile.language && prev.name === profile.name)
          return prev;
        return profile;
      });
    } else {
      setProfile({});
      setHasBox(false);
      const name = await getLegacyName();
      if (name) {
        setHasLegacy(true);
        setName(name);
      } else {
        setHasLegacy(false);
        setName(null);
      }
    }
  }, [
    setHasBox,
    setSyncing,
    setSigningUp,
    setName,
    setProfile,
    getLegacyName,
    setHasLegacy,
  ]);

  if (web3 === null) {
    return (
      <Install
        awaitingReload={awaitingReload}
        setAwaitingReload={setAwaitingReload}
      />
    );
  }
  if (account === undefined || hasBox === undefined) return <Loading />
  if (account === null) return <Login large={large} />

  if ((!hasBox && !hasLegacy) || name === null) {
    return (
      <div
        css={`
          display: flex;
          flex-direction: column;
          align-items: center;
        `}
      >
        <div
          css={`
            display: flex;
          `}
        >
          <div
            css={`
              margin-right: 5px;
            `}
          >
            <input
              value={unsavedName}
              onChange={e => setUnsavedName(e.target.value)}
              placeholder={ t('whats_your_name') }
              disabled={ signingUp }
            />
          </div>
          <button
            onClick={ () => signup(unsavedName) }
            disabled={ unsavedName === '' || signingUp }
          >
            { hasBox ? t('save') : t('create_3box_account') }
          </button>
          <LoadingIcon loading={ signingUp } />
        </div>
      </div>
    );
  }

  return (
    <div
      css={`
        display: flex;
      `}
    >
      <ExternalLink
        type="3box"
        value={account}
        toolTipPosition="bottomLeft"
      >
        {name}
      </ExternalLink>
      { !box
        && Object.keys(unsavedData).some(d => unsavedData[d])
        && (
        <div
          css={`
            margin: 0 10px;
            display: flex;
          `}
        >
          <button
            onClick={ !hasBox ? () => signup(name) : () => openBox() }
            disabled={ syncing }
          >
            { !hasBox ? t('create_3box_account') : t('sync_with_3box') }
          </button>
          <LoadingIcon loading={ syncing } />
        </div>
      ) }

    </div>
  );

}

const LoadingIcon = ({ loading }) => {
  if (!loading) return <div css="width: 23px" />
  return (
    <img
      src={loadingIcon}
      css={`
        margin-left: 5px;
        width: 18px;
        height: 18px
      `}
    />
  );
}

const Login = ({ large }) => {

  const web3 = useContext(Web3Context);
  const { currentProvider } = web3;
  const login = useCallback(() => {
    web3.eth.requestAccounts();
  }, [web3]);
  const t = useT();

  if (currentProvider.isNiftyWallet) {
    return (
      <div
        css={`
          display: flex;
          flex-direction: column;
          align-items: center;
        `}
      >
        <div>
          { t('log_in_with_nifty') }
        </div>
        { large && (
          <img src={unlockNifty} css="border: 1px solid black;" />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={login}
    >
      { t('log_in') }
    </button>
  );

}

const Install = ({ awaitingReload, setAwaitingReload }) => {

  const [message, setMessage] = useState();
  const t = useT();

  useEffect(() => {
    if (awaitingReload) {
      setMessage(t('wallet_installed'));
    } else {
      setMessage(t('install_wallet'));
    }
  }, [ awaitingReload, setMessage ])

  const onClick = useCallback(async () => {
    if (awaitingReload) {
      window.location.reload(false);
    } else {
      window.open('https://metamask.io');
      await sleep(1000);
      setAwaitingReload(true);
    }
  }, [ awaitingReload, window, sleep, setAwaitingReload ]);

  return (
    <div css="display: flex; justify-content: center">
      <button
        onClick={onClick}
        >
        {message}
      </button>
    </div>
  );

}

export default Account
