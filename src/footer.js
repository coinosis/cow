import React, { useContext, useEffect, useState } from 'react';
import { Hash } from './helpers';
import { ContractContext } from './event';
import { Web3Context } from './coinosis';
import { useT } from './i18n';

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
  const t = useT();

  useEffect(() => {
    if (contract === undefined) return;
    setAddress(contract._address);
    if (version == 0) setVersionString(`${ t('version') } 0.2.0`);
    else if (version == 1) setVersionString(`${ t('version') } 1.3.1`);
    else {
      contract.methods
      .version()
      .call()
      .then(versionHex => {
        const versionNumber = web3.utils.hexToUtf8(versionHex);
        setVersionString(`${t('version')} ${versionNumber}`);
      })
      .catch(() => {
        setVersionString(t('out_of_order'));
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
        { t('contract') }
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
