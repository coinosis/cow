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

const Amount = ({ usd: usdWei, eth: wei, rate: rateWei, ...props }) => {

  const web3 = useContext(Web3Context);
  const backendURL = useContext(BackendContext);
  const [currencyType, setCurrencyType] = useContext(CurrencyContext);
  const getETHPrice = useETHPrice();

  const [usd, setUSD] = useState();
  const [eth, setETH] = useState();
  const [currency, setCurrency] = useState();
  const [rate, setRate] = useState();
  const [displayRate, setDisplayRate] = useState(false);

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
      }
      const usdRounded = Number(web3.utils.fromWei(String(usdWei))).toFixed(2);
      const ethRounded = Number(web3.utils.fromWei(String(wei))).toFixed(3);
      const rateRounded = Number(
        web3.utils.fromWei(String(rateWei))
      ).toFixed(2);
      setUSD(`${usdRounded} USD`);
      setETH(`${ethRounded} ETH`);
      setRate(`${rateRounded} USD/ETH`);
    }
    setValues();
  }, [ usdWei, wei, rateWei ]);

  useEffect(() => {
    setCurrency(currencyType === ETH ? eth : usd);
  }, [ currencyType, eth, usd ]);

  const switchCurrencyType = useCallback(() => {
    setCurrencyType(currencyType => currencyType === ETH ? USD : ETH);
  }, []);

  return (
    <div>
      <ToolTip value={rate} show={displayRate} />
      <button
        onClick={switchCurrencyType}
        onMouseOver={() => setDisplayRate(true)}
        onMouseOut={() => setDisplayRate(false)}
        css={`
          background: ${currencyType === ETH ? '#97b9ca' : '#97cab3'};
          border: none;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        `}
        { ...props }
      >
        {currency}
      </button>
    </div>
  );
}

export default Amount;
