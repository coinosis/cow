import React, { useContext, useEffect, useState } from 'react';
import { Hash } from './helpers';
import { ContractContext } from './event';
import { Web3Context } from './coinosis';

const Footer = ({ hidden, currency }) => {
  return (
    <div
      css={`
        position: fixed;
        bottom: 0;
        width: 100%;
        display: ${hidden ? 'none' : 'flex'};
        justify-content: center;
      `}
    >
      <ContractInfo currency={currency} />
    </div>
  );
}

const ContractInfo = ({ currency }) => {

  const web3 = useContext(Web3Context);
  const { contract, version } = useContext(ContractContext);
  const [address, setAddress] = useState('');
  const [versionString, setVersionString] = useState('');
  const [color, setColor] = useState('black');

  useEffect(() => {
    if (contract === undefined) return;
    setAddress(contract._address);
    if (version == 0) setVersionString('versión 0.2.0');
    else if (version == 1) setVersionString('versión 1.3.1');
    else {
      contract.methods
      .version()
      .call()
      .then(versionHex => {
        const versionNumber = web3.utils.hexToUtf8(versionHex);
        setVersionString(`versión ${versionNumber}`);
      })
      .catch(() => {
        setVersionString('(fuera de servicio)');
        setColor('#a04040');
      });
    }
  }, [ contract, version ]);

  return (
    <div
      css={`
        display: flex;
        justify-content: center;
        background: #f0f0f0;
        border-radius: 4px;
      `}
    >
      <div>
        contrato
      </div>
      <div
        css={`
          margin: 0 5px;
        `}
      >
        <Hash
          type="address"
          value={address}
          toolTipPosition="top"
          currency={currency}
        />
      </div>
      <div
        css={`
          color: ${color};
        `}
      >
        {versionString}
      </div>
    </div>
  );
}

export default Footer;
