import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Hash } from './helpers';
import logo from './assets/logo.png';
import { ContractContext } from './result';
import Account from './account';

const Header = () => {

  return (
    <div
      css={`
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fafafa;
        box-shadow: 0 1px 10px rgba(151, 164, 175, .1);
        padding: 10px 40px;
        margin-bottom: 40px;
      `}
    >
      <HeaderItem
        css={`
          justify-content: flex-start;
        `}
      />
      <HeaderItem
        css={`
          justify-content: center;
          font-size: 26px;
        `}
      >
        <Link to="/">
          <img src={logo} height={45} alt="coinosis" />
        </Link>
      </HeaderItem>
      <HeaderItem
        css={`
          justify-content: flex-end;
        `}
      >
        <Account/>
      </HeaderItem>
    </div>
  );
}

const HeaderItem = styled.div`
  width: 33.333%;
  display: flex;
`

const ContractInfo = () => {

  const contract = useContext(ContractContext);
  const [address, setAddress] = useState('');
  const [version, setVersion] = useState('');
  const [color, setColor] = useState('black');

  useEffect(() => {
    if (contract) {
      setAddress(contract._address);
      contract.methods
        .version()
        .call()
        .then(setVersion)
        .catch(err => {
          setVersion('(fuera de servicio)');
          setColor('#a04040');
        });
    }
  }, [contract]);

  return (
    <div
      css={`
        display: flex;
        justify-content: center;
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
        <Hash type="address" value={address} toolTipPosition="bottomLeft" />
      </div>
      <div
        css={`
          color: ${color};
        `}
      >
        {version}
      </div>
    </div>
  );
}

export default Header;
