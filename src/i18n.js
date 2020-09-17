import { useContext } from 'react';
import { AccountContext } from './coinosis';
import esStrings from '../i18n/es.json';
import enStrings from '../i18n/en.json';
import { es as esLocale } from 'date-fns/esm/locale';
import { default as enLocale } from 'date-fns/esm/locale/en-US';

const strings = { es: esStrings, en: enStrings };

export const useT = () => {
  const { language: accountLanguage } = useContext(AccountContext);
  const language = accountLanguage || 'en';
  return string => {
    const translation = strings[language][string];
    return translation || strings.es[string];
  };
}

export const useFormatDate = () => {
  const { language } = useContext(AccountContext);
  return date => (
    date.toLocaleString(language, {dateStyle: 'full', timeStyle: 'long'})
  );
}

export const useLocale = () => {
  const { language } = useContext(AccountContext);
  if (language === 'es') return esLocale;
  return enLocale;
}

export const useDateFormat = () => {
  const { language } = useContext(AccountContext);
  if (language === 'es') return "dd 'de' MMMM 'de' yyyy, h:mm aa";
  return "MMMM d, yyyy, h:mm aa";
}
