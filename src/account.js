import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { environment, Loading, Link, usePost } from './helpers.js';

const Account = () => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const {
    account,
    setAccount,
    name,
    setName,
    email,
    setEmail,
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
        if (data.email) {
          setEmail(data.email);
        } else {
          setEmail(null);
        }
      }).catch(err => {
        setName(null);
        setEmail(null);
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
    });
  }, [account, unsavedName]);

  if (account === undefined) return <Loading />
  if (account === null) return <Login />

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

const Login = () => {

  const web3 = useContext(Web3Context);
  const login = useCallback(() => {
    web3.eth.requestAccounts();
  }, [web3]);

  return (
    <button
      onClick={login}
    >
      inicia sesión
    </button>
  );

}

export default Account
