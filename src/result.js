import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import abiV1 from '../contracts/Coinosis.abi.json';
import abiV0 from '../contracts/CoinosisV0.abi.json';
import deployments from '../deployments.json';
import { Web3Context } from './coinosis';
import Amount from './amount';
import {
  ToolTip,
  Hash,
  EtherscanLink,
  NoContract,
  useDistributionPrice,
  useGetUser,
  useETHPrice,
} from './helpers';
import { ContractContext } from './event';
import Footer from './footer';

const Result = ({ url: eventURL, currency }) => {

  const web3 = useContext(Web3Context);
  const { version, contract: contractV2 } = useContext(ContractContext);
  const [contract, setContract] = useState();

  const setContractV1And0 = useCallback(version => {
    if (!web3) return;
    const abi = version === 1 ? abiV1 : abiV0;
    web3.eth.net.getId().then(networkId => {
      const address = deployments[version][networkId];
      if (!address) {
        setContract(null);
        return;
      }
      const contract = new web3.eth.Contract(abi, address);
      setContract(contract);
    });
  }, [ web3, abiV1, abiV0 ]);

  useEffect(() => {
    if (version === undefined) return;
    if (version === 2) setContract(contractV2);
    else if (version === 1 || version === 0) setContractV1And0(version);
  }, [ version, contractV2, setContractV1And0 ]);

  if (contract === null) return <NoContract currency={currency} />

  return (
    <ContractContext.Provider value={{ contract, version }}>
      <Assessments eventURL={eventURL} currency={currency} />
      <Footer hidden={version >= 2} />
    </ContractContext.Provider>
  );
}

const Assessments = ({ eventURL, currency }) => {

  const isMounted = useRef(true);
  const web3 = useContext(Web3Context);
  const { contract, version } = useContext(ContractContext);
  const [assessments, setAssessments] = useState([]);
  const getETHPrice = useETHPrice();
  const getUser = useGetUser();
  const distributionPrice = useDistributionPrice(eventURL);

  const setAssessmentsV2 = useCallback(async (event, distributionPrice) => {
    const blockNumber = event.blockNumber;
    const id = event.transactionHash;
    const totalFeesWei = event.returnValues.totalReward;
    const ETHPriceUSDWei = distributionPrice;
    const addresses = await contract.methods.getAttendees().call();
    const block = await web3.eth.getBlock(blockNumber);
    const { timestamp } = block;
    const claps = await Promise.all(addresses.map(address =>
      contract.methods.claps(address).call()
    ));
    const users = await Promise.all(addresses.map(address =>
      getUser(address)
    ));
    const names = users.map(user => user.name);
    const registrationFeeWei = await contract.methods.fee().call();
    const transfers = await contract.getPastEvents(
      'Transfer',
      { fromBlock: 0 }
    );
    const rewards = addresses.map(address => {
      const transfer = transfers.find(transfer =>
        transfer.returnValues.attendee === address
      );
      if (transfer !== undefined) {
        return transfer.returnValues.reward;
      } else {
        return '0';
      }
    });
    const totalClaps = await contract.methods.totalClaps().call();
    const assessment = {
      id,
      blockNumber,
      timestamp,
      ETHPriceUSDWei,
      names,
      addresses,
      claps,
      registrationFeeWei,
      totalFeesWei,
      totalClaps,
      rewards,
    };
    setAssessments([ assessment ]);
  }, [ contract, getETHPrice, web3, eventURL ]);

  const setAssessmentsV1And0 = useCallback(version => {
    if (!contract) return;
    let topics;
    if (version === 1) {
      topics = [ null, web3.utils.sha3(eventURL) ];
    } else if (version === 0) {
      topics = undefined;
    }
    contract.events.Assessment({ fromBlock: 0, topics }, (error, event) => {
      if (error) {
        console.error(error);
        return;
      }
      event.returnValues.id = event.transactionHash;
      event.returnValues.blockNumber = event.blockNumber;
      if (isMounted.current) {
        setAssessments(assessments => {
          if (assessments.map(a => a.id).includes(event.returnValues.id)) {
            return assessments;
          }
          return [ event.returnValues, ...assessments ];
        });
      }
    });
    return () => {
      isMounted.current = false;
    }
  }, [ contract ]);

  const awaitDistribution = useCallback(() => {
    if (contract === undefined || distributionPrice === undefined) return;
    contract.events.Distribution(
      { fromBlock: 0 },
      async (error, event) => {
        if (error) {
          console.error(error);
          return;
        }
        setAssessmentsV2(event, distributionPrice);
      });
  }, [ contract, setAssessmentsV2, distributionPrice ]);

  useEffect(() => {
    if (version === undefined) return;
    if (version === 2) awaitDistribution();
    else if (version === 1 || version === 0) setAssessmentsV1And0(version);
  }, [ version, awaitDistribution, setAssessmentsV1And0 ]);

  if (!assessments.length) {
    return <div/>;
  }

  return (
    <div>
      {assessments.map(assessment => {
        return (
          <Assessment
            key={assessment.id}
            currency={currency}
            { ...assessment }
          />
        );
      })}
    </div>
  );

}

const Assessment = ({
  id,
  blockNumber,
  timestamp,
  registrationFeeUSDWei,
  ETHPriceUSDWei,
  names,
  addresses,
  claps,
  registrationFeeWei,
  totalFeesWei,
  totalClaps,
  rewards,
  currency,
}) => {

  const [totalBalance, setTotalBalance] = useState();

  useEffect(() => {
    const totalRewards = rewards.reduce((a, b) => BigInt(a) + BigInt(b))
    const totalBalance = BigInt(totalRewards) - BigInt(totalFeesWei);
    setTotalBalance(String(totalBalance));
  }, []);

  return (
    <div
      css={`
        margin: 20px;
        background: #f8f8f8;
        padding: 10px;
        border-radius: 4px;
        border: 1px solid #e8e8e8;
        box-shadow: 1px 1px #e8e8e8;
      `}
    >
      <Header
        id={id}
        timestamp={timestamp}
        addresses={addresses}
        registrationFeeUSDWei={registrationFeeUSDWei}
        registrationFeeWei={registrationFeeWei}
        ETHPriceUSDWei={ETHPriceUSDWei}
        totalFeesWei={totalFeesWei}
        currency={currency}
      />
      <div
        css={`
          margin-top: 15px;
        `}
      >
        <table>
          <thead>
            <tr
              css={`
                background: #d0d0d0;
              `}
            >
              <th>participante</th>
              <th>aplausos</th>
              <th>porcentaje</th>
              <th>recompensa</th>
              <th>balance</th>
              <th
                css={`
                  padding: 10px 20px;
                `}
              >
                estado
              </th>
            </tr>
          </thead>
          <tbody>
            {addresses.map((address, i) => {
              return (
                <Participant
                  key={address}
                  blockNumber={blockNumber}
                  name={names[i]}
                  address={addresses[i]}
                  claps={claps[i]}
                  totalClaps={totalClaps}
                  reward={rewards[i]}
                  rate={ETHPriceUSDWei}
                  registrationFeeWei={registrationFeeWei}
                  ETHPriceUSDWei={ETHPriceUSDWei}
                  currency={currency}
                />
              );
            })}
          </tbody>
          <tfoot>
            <tr
              css={`
                background: #d0d0d0;
              `}
            >
              <th
                css={`
                  padding: 10px 20px;
                `}
              >total</th>
              <th>
                {totalClaps}
              </th>
              <th>
                100.0 %
              </th>
              <th>
                <Amount
                  eth={totalFeesWei}
                  rate={ETHPriceUSDWei}
                  currency={currency}
                  css={`font-weight: bold`}
                />
              </th>
              <th>
                { totalBalance && (
                  <Amount
                    eth={totalBalance}
                    rate={ETHPriceUSDWei}
                    currency={currency}
                    css={`font-weight: bold`}
                  />
                )}
              </th>
              <th/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const Header = ({
  id,
  timestamp,
  addresses,
  registrationFeeUSDWei,
  registrationFeeWei,
  ETHPriceUSDWei,
  totalFeesWei,
  currency,
}) => {
  return (
    <div>
      <div
        css={`
          display: flex;
          align-items: flex-end;
        `}
      >
        <div
          css={`
            font-size: 24px;
            display: flex;
          `}
        >
          <div>
            distribución
          </div>
          <div
            css={`
            margin-left: 5px;
          `}
          >
            <Hash type="tx" value={id} />
          </div>
        </div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          <DateTime timestamp={timestamp} />
        </div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          ({addresses.length}
        </div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          participantes)
        </div>
      </div>
      <div
        css={`
          display: flex;
        `}
      >
        <div>aporte por persona:</div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          <Amount
            usd={registrationFeeUSDWei}
            eth={registrationFeeWei}
            rate={ETHPriceUSDWei}
            currency={currency}
          />
        </div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          aporte total:
        </div>
        <div
          css={`
            margin-left: 5px;
          `}
        >
          <Amount
            eth={totalFeesWei}
            rate={ETHPriceUSDWei}
            currency={currency}
          />
        </div>
      </div>
    </div>
  )
}

const Participant = ({
  blockNumber,
  name,
  address,
  claps,
  totalClaps,
  reward,
  rate,
  registrationFeeWei,
  ETHPriceUSDWei,
  currency,
}) => {

  const isMounted = useRef(true);
  const { contract, version } = useContext(ContractContext);
  const [percentage, setPercentage] = useState();
  const [fraction, setFraction] = useState('');
  const [balance, setBalance] = useState('');
  const [tx, setTx] = useState('');
  const [showFraction, setShowFraction] = useState(false);

  useEffect(() => {
    const percentage = 100 * +claps / +totalClaps;
    setPercentage(percentage.toFixed(1) + ' %');
    setFraction(claps + ' / ' + totalClaps);
    const balance = reward - registrationFeeWei;
    setBalance(String(balance));
  }, []);

  const setTransfersV2 = useCallback(async () => {
    const transfers = await contract.getPastEvents(
      'Transfer',
      { fromBlock: 0 }
    );
    const transfer = transfers.find(transfer =>
      transfer.returnValues.attendee === address
    );
    if (transfer !== undefined) {
      setTx(transfer.transactionHash);
    }
  }, [ contract ]);

  const setTransfersV1 = useCallback(() => {
    contract.events.Transfer(
      { fromBlock: blockNumber, filter: {addr: address} },
      (error, event) => {
        if (error) {
          console.error(error);
          return;
        }
        if (event.returnValues.addr !== address) return;
        if (isMounted.current) {
          setTx(event.transactionHash);
        }
      }
    );
    return () => {
      isMounted.current = false;
    }
  }, [ contract, blockNumber, address, isMounted ]);

  useEffect(() => {
    if (version === undefined) return;
    if (version === 2) setTransfersV2();
    if (version === 1 || version === 0) setTransfersV1();
  }, [ version, setTransfersV2, setTransfersV1 ]);

  return (
    <tr>
      <td
        css={`
          padding: 10px 30px;
          text-align: center;
        `}
      >
        <EtherscanLink
          type="address"
          value={address}
          internal
        >
          {name}
        </EtherscanLink>
      </td>
      <td
        css={`
          text-align: center;
          padding: 0 30px;
        `}
      >{claps}</td>
      <td
        css={`
          text-align: center;
          padding: 0 30px;
        `}
      >
        <ToolTip value={fraction} show={showFraction} />
        <div
          onMouseOver={() => setShowFraction(true)}
          onMouseOut={() => setShowFraction(false)}
        >
          {percentage}
        </div>
      </td>
      <td
        css={`
          padding: 0 30px;
        `}
      >
        <Amount eth={reward} rate={rate} currency={currency} />
      </td>
      <td
        css={`
          padding: 0 30px;
        `}
      >
        <Amount eth={balance} rate={ETHPriceUSDWei} currency={currency} />
      </td>
      <td
        css={`
          padding: 0 30px;
        `}
      >
        <Status tx={tx} />
      </td>
    </tr>
  );
}

const Status = ({tx}) => {

  if (!tx) return <div/>

  return (
    <EtherscanLink
      type="tx"
      value={tx}
      internal
    >
      enviada
    </EtherscanLink>
  );
}

const DateTime = ({ timestamp }) => {

  const [date, setDate] = useState();

  useEffect(() => {
    const date = new Date(timestamp * 1000);
    setDate(date.toLocaleString());
  }, [ timestamp ]);

  return (
    <div>
      {date}
    </div>
  );
}

export default Result
