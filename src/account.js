import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { Loading, Link, usePost, sleep } from './helpers.js';
import unlockNifty from './assets/unlockNifty.gif';

const Account = ({ large }) => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const {
    account,
    setAccount,
    name,
    setName,
    setData,
    awaitingReload,
    setAwaitingReload,
  } = useContext(AccountContext);
  const [unsavedName, setUnsavedName] = useState('');
  const [message, setMessage] = useState('');
  const post = usePost();

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
    const accountsInterval = setInterval(updateAccounts, 1000);
    return () => {
      clearInterval(accountsInterval);
    }
  }, [web3]);

  useEffect(() => {
    if(!account || !backendURL) return;
    fetch(`${backendURL}/user/${account}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        else {
          return response.json();
        }
      }).then(data => {
        setName(data.name);
        setData(data);
      }).catch(() => {
        setName(null);
        setData(null);
      });
  }, [account, backendURL]);

  const signup = useCallback(() => {
    const object = {
      address: account,
      name: unsavedName
    };
    post('users', object, (error, data) => {
      if (error) {
        if (error.toString().includes('400')) {
          setMessage('ese nombre ya existe en nuestra base de datos');
        }
        return;
      }
      setName(data.name);
      setData(data);
    });
  }, [account, unsavedName]);

  if (web3 === null) {
    return (
      <Install
        awaitingReload={awaitingReload}
        setAwaitingReload={setAwaitingReload}
      />
    );
  }
  if (account === undefined) return <Loading />
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
        <div>
          <div>
            {message}
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
