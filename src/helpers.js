import "regenerator-runtime/runtime";
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import styled from 'styled-components';
import {
  Web3Context,
  AccountContext,
  BackendContext,
} from './coinosis';
import ethereumMetamask from './assets/ethereumMetamask.gif';
import xDaiMetamask from './assets/xDaiMetamask.gif';
import ethereumNifty from './assets/ethereumNifty.gif';
import xDaiNifty from './assets/xDaiNifty.gif';
import { useT } from './i18n';

export const environment = process.env.ENVIRONMENT || 'development';

export const ATTENDEE_UNREGISTERED = 0;
export const ATTENDEE_REGISTERED = 1;
export const ATTENDEE_CLICKED_SEND = 1.8;
export const ATTENDEE_SENT_CLAPS = 1.9;
export const ATTENDEE_CLAPPED = 2;
export const ATTENDEE_CLICKED_DISTRIBUTE = 2.8;
export const ATTENDEE_SENT_DISTRIBUTION = 2.9;
export const ATTENDEE_REWARDED = 3;

export const sleep = time => new Promise(resolve => setTimeout(resolve, time));

export const Loading = () => {
  return (
    <div
      css={`
        display: flex;
        justify-content: center;
      `}
    >
      loading...
    </div>
  );
}

export const ToolTip = ({ value, show, position="top" }) => {

  return (
    <div css="position: relative">
      <div
        css={`
          display: ${show ? 'block' : 'none'};
          position: absolute;
          ${ position !== 'top' ? 'top: 25px;' : 'bottom: 7px'};
          ${ position === 'bottomRight' ? 'left: 0'
             : position === 'bottomLeft' ? 'right: 0' : '' };
          background: black;
          color: #f0f0f0;
          padding: 5px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: normal;
        `}
      >
        {value}
      </div>
    </div>
  );
}

const shorten = address => {
  const prefix = address.substring(0, 6);
  const postfix = address.substring(address.length - 4);
  return `${prefix}...${postfix}`;
}

export const Hash = ({ type, value, currency, toolTipPosition="top" }) => {

  const [short, setShort] = useState();

  useEffect(() => {
    if (!value) return;
    setShort(shorten(value));
  }, [value]);

  return (
    <div>
      <ExternalLink
        type={type}
        value={value}
        currency={currency}
        toolTipPosition={toolTipPosition}
      >
        {short}
      </ExternalLink>
    </div>
  );
}

export const Link = props => {
  return (
    <RouterLink
      {...props}
      css={`
        margin: 0 5px;
        text-decoration: underline;
        cursor: pointer;
        color: black;
      `}
    >
      {props.children}
    </RouterLink>
  );
}

export const ExternalLink = ({
  type,
  value,
  internal=false,
  children,
  currency,
  toolTipPosition="top",
  ...props
}) => {

  const [href, setHref] = useState('');
  const [showToolTip, setShowToolTip] = useState(false);

  useEffect(() => {
    let href;
    if (type === '3box') {
      href = `https://3box.io/${value}`;
    } else {
      const blockExplorer = currency === 'xDAI'
            ? 'https://blockscout.com/poa/dai'
            : 'https://etherscan.io';
      href = `${blockExplorer}/${type}/${value}`;
      if (internal) {
        if (currency === 'xDAI') {
          href += '/internal_transactions';
        } else {
          href += '#internal';
          if (type === 'address') {
            href += 'tx';
          }
        }
      }
    }
    setHref(href);
  }, [ value, type, setHref, currency, ]);

  return (
    <div>
      <ToolTip
        value={value}
        show={showToolTip}
        position={toolTipPosition}
      />
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        css={`
          color: black;
          &:visited {
            color: black;
          }
          white-space: nowrap;
        `}
        onMouseOver={() => setShowToolTip(true)}
        onMouseOut={() => setShowToolTip(false)}
        tabIndex={-1}
        {...props}
      >
        {children}
      </a>
    </div>
  );
}

export const usePost = () => {

  const { account } = useContext(AccountContext);
  const backendURL = useContext(BackendContext);
  const web3 = useContext(Web3Context);

  return useCallback((
    endpoint,
    object,
    callback,
    method = 'POST',
    onSign = () => {}
  ) => {
    const payload = JSON.stringify(object);
    const hex = web3.utils.utf8ToHex(payload);
    web3.eth.personal.sign(hex, account).then(signature => {
      onSign();
      object.signature = signature;
      const body = JSON.stringify(object);
      fetch(`${backendURL}/${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      }).then(response => {
        if (!response.ok) {
          throw new Error(response.status);
        } else {
          return response.json();
        }
      }).then(data => {
        callback(null, data);
      }).catch(err => {
        callback(err, null);
      });
    }).catch(err => {
      callback(err, null);
    });
  }, [account, backendURL, web3]);
}

export const NoContract = ({ currency }) => {

  const web3 = useContext(Web3Context);
  const [network, setNetwork] = useState();
  const [provider, setProvider] = useState();
  const [rpcData, setRPCData] = useState();
  const [gif, setGIF] = useState();
  const t = useT();

  useEffect(() => {
    if (web3 === undefined) return;
    const { currentProvider } = web3;
    if (currentProvider.isNiftyWallet) {
      setNetwork(currency === 'xDAI' ? 'xDai' : 'Ethereum');
      setProvider('Nifty Wallet.');
      setGIF(currency === 'xDAI' ? xDaiNifty : ethereumNifty);
    } else if (currentProvider.isMetaMask) {
      if (currency === 'ETH') {
        setNetwork('Main Ethereum Network');
        setProvider('Metamask.');
        setGIF(ethereumMetamask);
      } else if (currency === 'xDAI') {
        setNetwork('Custom RPC');
        setProvider(`Metamask ${ t('and_fill_in_the_following_data') }`);
        setRPCData({
          'Network Name': 'xDai',
          'New RPC URL': 'https://xdai.poanetwork.dev',
          ChainID: 100,
          Symbol: 'xDai',
          'Block Explorer URL': 'https://blockscout.com/poa/xdai',
        });
        setGIF(xDaiMetamask);
      }
    } else {
      setNetwork(currency === 'xDAI' ? 'xDai' : 'Ethereum');
      setProvider(t('your_web3_provider'));
    }
  }, [ web3 ]);

  return (
    <div
      css={`
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      <SectionTitle>
        { t('wrong_chain') }
      </SectionTitle>
      <div>
        { t('please_select') }  &quot;{network}&quot; { t('in') } {provider}
      </div>
      { rpcData && (
        <div
          css={`
            display: flex;
            flex-direction: column;
          `}
        >
          <ul>
            { Object.keys(rpcData).map(key => (
              <li key={key}>{key}: <b>{rpcData[key]}</b></li>
            ))}
          </ul>
        </div>
      )}
      <img src={gif} css="border: 1px solid black;" />
    </div>
  )
}

export const SectionTitle = styled.div`
  font-size: 30px;
  margin-top: 70px;
  margin-bottom: 15px;
`

export const useConversions = () => {

  const [ethPrice, setETHPrice] = useState();
  const getETHPrice = useETHPrice();

  useEffect(() => {
    const getPrice = async () => {
      setETHPrice(await getETHPrice());
    }
    getPrice();
  }, [ getETHPrice ]);

  const toETH = useCallback(usd => {
    return usd / ethPrice;
  }, [ ethPrice ]);

  const toUSD = useCallback(eth => {
    return eth * ethPrice;
  }, [ ethPrice ]);

  return { toETH, toUSD };
}

export const useETHPrice = () => {

  const backendURL = useContext(BackendContext);

  return useCallback(async () => {
    const response = await fetch(`${backendURL}/eth/price`);
    if (!response.ok) {
      throw new Error(response.status);
    }
    const data = await response.json();
    return data;
  }, [ backendURL ]);

}

export const useGasPrice = () => {

  const backendURL = useContext(BackendContext);
  const web3 = useContext(Web3Context);

  return useCallback(async () => {
    const response = await fetch(`${backendURL}/eth/gas`);
    if (!response.ok) {
      throw new Error(response.status);
    }
    const { safe, propose } = await response.json();
    return { safe, propose };
  }, [ backendURL, web3 ]);

}

export const useGetUser = () => {

  const backendURL = useContext(BackendContext);

  return useCallback(async address => {
    const response = await fetch(`${backendURL}/user/${address}`);
    if (!response.ok) return { address, name: shorten(address) };
    const data = await response.json();
    return data;
  }, [ backendURL, ])

}

export const useDistributionPrice = event => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const getETHPrice = useETHPrice();
  const [ethPrice, setETHPrice] = useState();

  useEffect(() => {
    const getPrice = async () => {
      const response = await fetch(`${backendURL}/distribution/${event}`);
      if (!response.ok) {
        fetch(`${backendURL}/distribution/${event}`, { method: 'put' });
        const ethPrice = await getETHPrice();
        const ethPriceWei = web3.utils.toWei(ethPrice);
        setETHPrice(ethPriceWei);
      }
      const data = await response.json();
      const ethPriceWei = web3.utils.toWei(data.ethPrice);
      setETHPrice(ethPriceWei);
    }
    getPrice();
  }, [ backendURL, web3 ]);

  return ethPrice;
}

export const timestampInSeconds = date => {
  const timestamp = date.getTime();
  const string = String(timestamp);
  const truncated = string.substring(0, string.length - 3);
  const number = Number(truncated);
  return number;
}

export const dateFromTimestamp = timestamp => {
  const string = String(timestamp);
  const trailingZeroes = string + '000';
  const number = Number(trailingZeroes);
  const date = new Date(number);
  return date
}

export const convertDates = event => {
  event.beforeStart = new Date(event.beforeStart);
  event.start = new Date(event.start);
  event.end = new Date(event.end);
  event.afterEnd = new Date(event.afterEnd);
  return event;
}

export const Card = styled.div`
  margin: 20px;
  background: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  box-shadow: 1px 1px #e8e8e8;
`
