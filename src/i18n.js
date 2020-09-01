import { useContext } from 'react';
import { AccountContext } from './coinosis';
import es from '../i18n/es.json';
import en from '../i18n/en.json';

const strings = { es, en };

export const useT = () => {
  const { language: accountLanguage } = useContext(AccountContext);
  const language = accountLanguage || 'es';
  return string => {
    const translation = strings[language][string];
    return translation || strings.es[string];
  };
}
