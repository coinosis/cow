import React, { useCallback, useContext, useEffect, useState, } from 'react';
import { Big, Card, Link, } from './helpers';
import Markdown from 'react-markdown';
import { BackendContext, Web3Context, AccountContext, } from './coinosis';
import { useT } from './i18n';
import abi from '../contracts/ProxyEvent.abi.json';

const Course = ({ course }) => {

  const [ events, setEvents, ] = useState([]);
  const backendURL = useContext(BackendContext);
  const t = useT();
  const web3 = useContext(Web3Context);
  const { account } = useContext(AccountContext);

  useEffect(() => {
    const getEvents = async () => {
      for (const url of course.events) {
        const response = await fetch(`${ backendURL }/event/${ url }`);
        const event = await response.json();
        setEvents(prev => {
          const urls = prev.map(event => event.url);
          if (!urls.includes(event.url)) {
            return [ ...prev, event, ];
          } else return prev;
        });
      }
    }
    getEvents();
  }, [ course, backendURL, setEvents, ]);

  const register = useCallback(async () => {
    for (const event of events) {
      const contract = new web3.eth.Contract(abi, event.address);
      try {
        const fee = await contract.methods.fee().call();
        contract.methods.register().send({
          from: account,
          value: fee,
          gas: '200000',
          gasPrice: '1000000000',
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [ events, web3, account, ]);

  return (
    <div>
      <Big>{ course.name }</Big>
      <Card>
        <div
          css={`
            font-size: 23px;
          `}
        >
          { t('courses_events') }
        </div>
        <div css="margin: 20px 10px;">
          { events.map(event => (
            <div key={event.url}>
              <Link to={event.url} >{ event.name }</Link>
            </div>
          )) }
        </div>
        <div>
          <button onClick={ register }>
            { t('register_full_course') }
          </button>
        </div>
      </Card>
      <Card>
        <Markdown source={ course.description } linkTarget="_blank" />
      </Card>
    </div>
  );
}

export default Course;
