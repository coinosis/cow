import "regenerator-runtime/runtime";
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  Web3Context,
  BackendContext,
  CurrencyContext,
  ETH,
  USD,
} from './coinosis';
import { environment, ToolTip, useETHPrice } from './helpers.js';

const ethColor = '#97b9ca';
const usdColor = '#97cab3';

const Amount = ({ usd: usdWei, eth: wei, rate: rateWei, ...props }) => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const [currencyType, setCurrencyType] = useContext(CurrencyContext);
  const getETHPrice = useETHPrice();

  const [usd, setUSD] = useState();
  const [eth, setETH] = useState('_.___ ETH');
  const [currency, setCurrency] = useState();
  const [rate, setRate] = useState();
  const [displayRate, setDisplayRate] = useState(false);
  const [color, setColor] = useState();

  useEffect(() => {
    if (wei === undefined) return;
    const ethRounded = Math.round(
      Number(web3.utils.fromWei(String(wei))) * 1000
    ) / 1000;
    setETH(`${ethRounded} ETH`);
  }, [ wei ]);

  useEffect(() => {
    const setValues = async () => {
      if (!usdWei && !wei) return;
      if (!rateWei) {
        const rate = await getETHPrice();
        rateWei = web3.utils.toWei(rate);
      }
      if (!usdWei) {
        usdWei = BigInt(wei) * BigInt(rateWei) / BigInt(1e18);
      }
      else if (!wei) {
        wei = BigInt(usdWei) * BigInt(1e18) / BigInt(rateWei);
        const ethRounded = Number(web3.utils.fromWei(String(wei))).toFixed(3);
        setETH(`${ethRounded} ETH`);
      }
      const usdRounded = Number(web3.utils.fromWei(String(usdWei))).toFixed(2);
      const rateRounded = Number(
        web3.utils.fromWei(String(rateWei))
      ).toFixed(2);
      setUSD(`${usdRounded} USD`);
      setRate(`${rateRounded} USD/ETH`);
    }
    setValues();
  }, [ usdWei, wei, rateWei ]);

  useEffect(() => {
    setCurrency(currencyType === ETH ? eth : usd);
    setColor(currencyType === ETH ? ethColor : usdColor);
  }, [ currencyType, eth, usd ]);

  const switchCurrencyType = useCallback(() => {
    setCurrencyType(currencyType => currencyType === ETH ? USD : ETH);
  }, []);

  const onMouseOver = useCallback(() => {
    setDisplayRate(true);
    setCurrency(currencyType === ETH ? usd : eth);
    setColor(currencyType === ETH ? usdColor : ethColor);
  }, [ switchCurrencyType, currencyType, ETH, eth, usd ]);

  const onMouseOut = useCallback(() => {
    setDisplayRate(false);
    setCurrency(currencyType === ETH ? eth : usd);
    setColor(currencyType === ETH ? ethColor : usdColor);
  }, [ switchCurrencyType, currencyType, ETH, eth, usd ]);

  return (
    <div>
      <ToolTip value={rate} show={displayRate} />
      <button
        onClick={switchCurrencyType}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
        css={`
          background: ${color};
          border: none;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          min-width: 90px;
        `}
        { ...props }
      >
        {currency}
      </button>
    </div>
  );
}

export default Amount;
