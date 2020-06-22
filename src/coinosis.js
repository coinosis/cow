import React, { createContext, useEffect, useState } from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';
import Web3 from 'web3';
import { createGlobalStyle } from 'styled-components';
import InstallMetamask from './installMetamask';
import { environment, Loading } from './helpers';
import settings from '../settings.json';
import Header from './header';
import EventList from './eventList';
import Event from './event';
import Profile from './profile';

export const Web3Context = createContext();
export const AccountContext = createContext();
export const BackendContext = createContext();
export const CurrencyContext = createContext([]);

export const ETH = Symbol('ETH');
export const USD = Symbol('USD');

const Coinosis = () => {

  const [web3, setWeb3] = useState();
  const [account, setAccount] = useState();
  const [name, setName] = useState();
  const [data, setData] = useState();
  const [backendURL, setBackendURL] = useState();
  const [currencyType, setCurrencyType] = useState(ETH);

  useEffect(() => {
    if (!Web3.givenProvider) {
      setWeb3(null);
      return;
    }
    const web3 = new Web3(Web3.givenProvider);
    setWeb3(web3);
  }, []);

  useEffect(() => {
    fetch(settings[environment].backend)
      .then(() => {
        setBackendURL(settings[environment].backend);
      }).catch(() => {
        setBackendURL(null);
      });
  }, []);

  if (web3 === null) return <InstallMetamask/>
  if (backendURL === undefined) return <Loading/>

  return (
    <Web3Context.Provider value={web3}>
      <AccountContext.Provider value={{
        account,
        setAccount,
        name,
        setName,
        data,
        setData,
      }}>
        <BackendContext.Provider value={backendURL}>
          <CurrencyContext.Provider value={[currencyType, setCurrencyType]}>
            <GlobalStyle/>
            <HashRouter>
              <Header/>
              <Switch>
                <Route path="/:eventURL([a-z1-9-]{1}[a-z0-9-]{0,59})">
                  <Event/>
                </Route>
                <Route path="/:account(0x[0-9a-f]{40})">
                  <Profile/>
                </Route>
                <Route path="/">
                  <EventList />
                </Route>
              </Switch>
            </HashRouter>
          </CurrencyContext.Provider>
        </BackendContext.Provider>
      </AccountContext.Provider>
    </Web3Context.Provider>
  );
}

const GlobalStyle = createGlobalStyle`
  body {
    background: #f0f0f0;
    font-family: arial;
    margin: 0;
  }
`

export default Coinosis
