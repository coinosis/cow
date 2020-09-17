import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import logo from './assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faYoutube,
  faTwitter,
  faMedium,
  faTelegram,
  faGithub,
} from '@fortawesome/free-brands-svg-icons';
import { AccountContext } from './coinosis';
import Account from './account';
import { useT } from './i18n';

const Header = ({ setLanguage }) => {

  const { language } = useContext(AccountContext);
  const t = useT();

  return (
    <div
      css={`
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fafafa;
        box-shadow: 0 1px 10px rgba(151, 164, 175, .1);
        padding: 10px 40px;
        margin-bottom: 10px;
      `}
    >
      <HeaderItem
        css={`
          justify-content: space-between;
        `}
      >
        <div
          css={`
            margin: 8px 0;
            justify-content: flex-start;
          `}
        >
          <Icon
            icon={faYoutube}
            href="https://www.youtube.com/channel/UCUQF6Q6QpWwm4QoUYplekOg"
          />
          <Icon icon={faTwitter} href="https://twitter.com/coinosis" />
          <Icon icon={faMedium} href="https://medium.com/coinosis" />
          <Icon icon={faTelegram} href="https://t.me/coinosisdapp" />
          <Icon icon={faGithub} href="https://github.com/coinosis" />
        </div>
        <div
          css={`
            margin: 8px;
            justify-content: flex-end;
          `}
        >
          <select
            value={language}
            onChange={setLanguage}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
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
          flex-direction: column;
          align-items: flex-end;
        `}
      >
        <Account/>
        <a
          href="/legal.html"
          target="_blank"
          rel="noreferrer"
          css={`
            margin-top: 5px;
            font-size: 10px;
            color: black;
            &:visited {
              color: black;
            };
          `}
        >
          { t('legal') }
        </a>
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
        margin: 0 8px;
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
