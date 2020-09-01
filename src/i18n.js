import { useContext } from 'react';
import { AccountContext } from './coinosis';
import es from '../i18n/es.json';
import en from '../i18n/en.json';

const strings = { es, en };

export const useT = () => {
  const { language } = useContext(AccountContext);
  if (!language) return () => null;
  return string => {
    return strings[language][string];
  };
}
