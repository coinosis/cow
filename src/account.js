import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Web3Context, AccountContext, BackendContext } from './coinosis.js';
import { Loading, ExternalLink, sleep, usePost, } from './helpers.js';
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
    awaitingReload,
    setAwaitingReload,
  } = useContext(AccountContext);
  const [unsavedName, setUnsavedName] = useState('');
  const t = useT();
  const [ signingUp, setSigningUp ] = useState();
  const [ message, setMessage, ] = useState();
  const post = usePost();

  const updateAccounts = useCallback(async _accounts => {
    const accounts = _accounts || await web3.eth.getAccounts();
    if (accounts.length) {
      setAccount(prev => {
        if (!prev) return accounts[0];
        if (accounts[0] === prev) return prev;
        return accounts[0];
      });
    } else {
      setAccount(null);
      setName(null);
    }
  }, [ web3, setAccount, setName, ]);

  useEffect(() => {
    if (!window.ethereum) return;
    updateAccounts();
    window.ethereum.on('accountsChanged', updateAccounts);
  }, [ updateAccounts, ]);

  useEffect(() => {
    if(!backendURL || !account) return;
    const getAccount = async () => {
      const response = await fetch(`${backendURL}/user/${account}`);
      if (!response.ok) {
        setName(null);
        return;
      }
      try {
        const data = await response.json();
        setName(data.name);
      } catch (err) {
        setName(null);
        return;
      }
    }
    getAccount();
  }, [ account, backendURL, ]);

  const signup = useCallback(async () => {
    setSigningUp(true);
    const object = {
      address: account,
      name: unsavedName,
    };
    post('users', object, (err, data) => {
      if (err) {
        if (err.toString().includes('400')) {
          setMessage(t('name_exists'));
        }
      } else {
        setName(data.name);
      }
      setSigningUp(false);
    });
  }, [ setSigningUp, account, unsavedName, post, setMessage, t, setName, ]);

  const setUnsavedNameRaw = async name => {
    setUnsavedName(name);
    if (message) {
      setMessage('');
    }
  }

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
              onChange={e => setUnsavedNameRaw(e.target.value)}
              placeholder={ t('whats_your_name') }
              disabled={ signingUp }
            />
          </div>
          <button
            onClick={ signup }
            disabled={ unsavedName === '' || signingUp }
          >
            { t('save') }
          </button>
          <LoadingIcon loading={ signingUp } />
        </div>
        <div
          css={`
            font-size: 10px;
            color: red;
          `}
        >
          { message }
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
  }, [ awaitingReload, setMessage, t, ])

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
