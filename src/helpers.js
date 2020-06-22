import "regenerator-runtime/runtime";
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import styled from 'styled-components';
import {
  Web3Context,
  AccountContext,
  BackendContext,
} from './coinosis';

export const environment = process.env.ENVIRONMENT || 'development';

export const ATTENDEE_UNREGISTERED = 0;
export const ATTENDEE_REGISTERED = 1;
export const ATTENDEE_CLICKED_SEND = 1.8;
export const ATTENDEE_SENT_CLAPS = 1.9;
export const ATTENDEE_CLAPPED = 2;
export const ATTENDEE_CLICKED_DISTRIBUTE = 2.8;
export const ATTENDEE_SENT_DISTRIBUTION = 2.9;
export const ATTENDEE_REWARDED = 3;

export const Loading = () => {
  return (
    <div
      css={`
        display: flex;
        justify-content: center;
      `}
    >
      por favor espera...
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
          ${ position === 'bottomRight' ? 'right: 0'
             : position === 'bottomLeft' ? 'left: 0' : '' };
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

export const Hash = ({ type, value, toolTipPosition="top" }) => {

  const [short, setShort] = useState();

  useEffect(() => {
    if (!value) return;
    const length = value.length;
    const short = value.substring(0, 6) + '...' + value.substring(length - 4);
    setShort(short);
  }, [value]);

  return (
    <div>
      <EtherscanLink
        type={type}
        value={value}
        toolTipPosition={toolTipPosition}
      >
        {short}
      </EtherscanLink>
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

export const EtherscanLink = ({
  type,
  value,
  internal=false,
  children,
  toolTipPosition="top",
  ...props
}) => {

  const [href, setHref] = useState('');
  const [showToolTip, setShowToolTip] = useState(false);

  useEffect(() => {
    let href = `https://etherscan.io/${type}/${value}`;
    if (internal) {
      href += '#internal';
      if (type === 'address') {
        href += 'tx';
      }
    }
    setHref(href);
  }, [value]);

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

  return useCallback((endpoint, object, callback, method='POST') => {
    const payload = JSON.stringify(object);
    const hex = web3.utils.utf8ToHex(payload);
    web3.eth.personal.sign(hex, account).then(signature => {
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

export const NoContract = () => {

  const web3 = useContext(Web3Context);
  const [provider, setProvider] = useState();
  const [mainnet, setMainnet] = useState();

  useEffect(() => {
    if (web3 === undefined) return;
    const { currentProvider } = web3;
    if (currentProvider.isNiftyWallet) {
      setProvider('Nifty');
      setMainnet('Ethereum');
    } else if (currentProvider.isMetaMask) {
      setProvider('Metamask');
      setMainnet('Main Ethereum Network');
    } else {
      setProvider('tu proveedor de Web3');
      setMainnet('la red principal de Ethereum');
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
        ningún contrato ha sido desplegado en esta red
      </SectionTitle>
      <div>
        por favor apunta {provider} a {mainnet}.
      </div>
    </div>
  )
}

export const formatDate = date => (
  date.toLocaleString('es-CO', {dateStyle: 'full', timeStyle: 'long'})
);

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
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    return data;
  }, [ backendURL ])

}

export const useDistributionPrice = event => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const [ethPrice, setEthPrice] = useState();

  useEffect(() => {
    const getPrice = async () => {
      const response = await fetch(`${backendURL}/distribution/${event}`);
      if (!response.ok) {
        console.error(response.status);
        return;
      }
      const data = await response.json();
      const ethPriceWei = web3.utils.toWei(data.ethPrice);
      setEthPrice(ethPriceWei);
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
