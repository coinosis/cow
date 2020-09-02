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
    awaitingReload,
    setAwaitingReload,
  } = useContext(AccountContext);
  const [unsavedName, setUnsavedName] = useState('');
  const t = useT();
  const [ hasBox, setHasBox ] = useState();
  const [ hasLegacy, setHasLegacy ] = useState();
  const [ signingUp, setSigningUp ] = useState();
  const [ syncing, setSyncing ] = useState();

  const updateAccounts = useCallback(() => {
    web3.eth.getAccounts().then(accounts => {
      if (!accounts.length) {
        setAccount(null);
        setName(null);
      } else if (accounts[0] !== account) {
        setAccount(accounts[0]);
      }
    });
  }, [web3, account]);

  useEffect(() => {
    if (!web3) return;
    const accountsInterval = setInterval(updateAccounts, 3000);
    return () => {
      clearInterval(accountsInterval);
    }
  }, [web3]);

  const getLegacyName = useCallback(async account => {
    if(!backendURL) return null;
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
  }, [ backendURL ]);

  const openBox = useCallback(async () => {
    setSyncing(true);
    if (!account) return null;
    const box = await Box.openBox(account, web3.givenProvider);
    setBox(box);
    return box;
  }, [ setSyncing, account, web3, setBox, ]);

  const signup = useCallback(async () => {
    setSigningUp(true);
    const box = await openBox();
    await box.public.set('name', unsavedName);
  }, [ openBox, setSigningUp, unsavedName, ]);

  const getAccountStatus = useCallback(async () => {
    if (!account) return;
    if (box) {
      setHasBox(true);
      setName(await box.public.get('name'));
      setSyncing(false);
      setSigningUp(false);
      return;
    }
    const profile = await Box.getProfile(account);
    if (Object.keys(profile).length) {
      setHasBox(true);
      setSigningUp(false);
      if (profile.name) {
        setName(profile.name);
      } else {
        setName(null);
      }
    } else {
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
    account,
    box,
    setHasBox,
    setSyncing,
    setSigningUp,
    setName,
    getLegacyName,
    setHasLegacy,
  ]);

  useEffect(() => {
    const statusInterval = setInterval(getAccountStatus, 3000);
    return () => {
      clearInterval(statusInterval);
    }
  }, [ getAccountStatus, ]);

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
            onClick={signup}
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
      { !box && (
        <div
          css={`
            margin: 0 10px;
            display: flex;
          `}
        >
          <button onClick={openBox} disabled={ syncing }>
            { !hasBox ? t('create_3box_account') : t('sync_with_3box') }
          </button>
          <LoadingIcon loading={ syncing } />
        </div>
      ) }

    </div>
  );

}

const LoadingIcon = ({ loading }) => {
  if (!loading) return <div css="width: 25px" />
  return (
    <img
      src={loadingIcon}
      css={`
        margin-left: 5px;
        width: 20px;
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
