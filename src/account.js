import React, { useCallback, useContext, useEffect, useState } from 'react';
import Box from '3box';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { Loading, Link, sleep } from './helpers.js';
import unlockNifty from './assets/unlockNifty.gif';

const Account = ({ large }) => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const {
    account,
    setAccount,
    name,
    setName,
    awaitingReload,
    setAwaitingReload,
  } = useContext(AccountContext);
  const [ box, setBox ] = useState();
  const [unsavedName, setUnsavedName] = useState('');

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
              placeholder="¿cómo te llamas?"
            />
          </div>
          <div>
            <button
              onClick={signup}
              disabled={unsavedName === ''}
            >
              regístrate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/${account}`}
    >
      {name}
    </Link>
  );

}

const Login = ({ large }) => {

  const web3 = useContext(Web3Context);
  const { currentProvider } = web3;
  const login = useCallback(() => {
    web3.eth.requestAccounts();
  }, [web3]);

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
          inicia sesión en Nifty Wallet
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
      inicia sesión
    </button>
  );

}

const Install = ({ awaitingReload, setAwaitingReload }) => {

  const [message, setMessage] = useState();

  useEffect(() => {
    if (awaitingReload) {
      setMessage('ya instalé Metamask');
    } else {
      setMessage('instala tu billetera');
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
