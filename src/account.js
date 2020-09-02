import React, { useCallback, useContext, useEffect, useState } from 'react';
import Box from '3box';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { Loading, ExternalLink, sleep } from './helpers.js';
import unlockNifty from './assets/unlockNifty.gif';
import { useT } from './i18n';

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

  useEffect(() => {
    if (!account) return;
    const login = async () => {
      const box = await Box.openBox(account, web3.givenProvider);
      const name = await box.public.get('name');
      if (name) {
        setName(name);
      } else {
        const legacyName = await getLegacyName(account);
        if (legacyName) {
          setName(legacyName);
          await box.public.set('name', legacyName);
        } else {
          setName(null);
        }
      }
      setBox(box);
    }
    login();
  }, [ account, web3, setBox, setName, getLegacyName ]);

  const signup = useCallback(async () => {
    setName(unsavedName);
    await box.public.set('name', unsavedName);
  }, [ box, unsavedName ]);

  if (web3 === null) {
    return (
      <Install
        awaitingReload={awaitingReload}
        setAwaitingReload={setAwaitingReload}
      />
    );
  }
  if (account === undefined || name === undefined) return <Loading />
  if (account === null) return <Login large={large} />

  if (name === null) {
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
            />
          </div>
          <div>
            <button
              onClick={signup}
              disabled={unsavedName === ''}
            >
              { t('sign_up') }
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ExternalLink
      type="3box"
      value={account}
      toolTipPosition="bottomLeft"
    >
      {name}
    </ExternalLink>
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
