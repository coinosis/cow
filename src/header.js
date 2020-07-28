import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import logo from './assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTwitter,
  faMedium,
  faTelegram,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';

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
      >
        <Icon icon={faTwitter} href="https://twitter.com/coinosis" />
        <Icon icon={faMedium} href="https://medium.com/coinosis" />
        <Icon icon={faTelegram} href="https://t.me/coinosisdapp" />
        <Icon icon={faGithub} href="https://github.com/coinosis" />
      </HeaderItem>
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

const Icon = ({ icon, href }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      css={`
        margin: 8px;
        color: initial;
        &:hover {
          color: #0e8f00;
        };
      `}
    >
      <FontAwesomeIcon icon={icon} />
    </a>
  );
}

export default Header;
