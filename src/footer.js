import React, { useContext, useEffect, useState } from 'react';
import { Hash } from './helpers';
import { ContractContext } from './event';

const Footer = ({ hidden }) => {
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
      <ContractInfo/>
    </div>
  );
}

const ContractInfo = () => {

  const { contract, version } = useContext(ContractContext);
  const [address, setAddress] = useState('');
  const [versionString, setVersionString] = useState('');
  const [color, setColor] = useState('black');

  useEffect(() => {
    if (contract) {
      setAddress(contract._address);
      try {
      contract.methods
        .version()
        .call()
        .then(setVersionString)
        .catch(err => {
          setVersionString('(fuera de servicio)');
          setColor('#a04040');
        });
      } catch (err) {
        setVersionString('0.2.0');
      }
    }
  }, [contract]);

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
        <Hash type="address" value={address} toolTipPosition="top" />
      </div>
      <div
        css={`
          color: ${color};
        `}
      >
        versión {versionString}
      </div>
    </div>
  );
}

export default Footer;
