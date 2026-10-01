import React, { createContext, useContext, useState } from 'react';
import hi from './hi.json';
import en from './en.json';

const translations = { hi, en };
export type Lang = 'hi' | 'en';
export type TranslationKey = keyof typeof hi;

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'hi',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('hi');
  return <I18nContext.Provider value={{ lang, setLang }}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const { lang, setLang } = useContext(I18nContext);
  return {
    t: (key: TranslationKey) => translations[lang][key] || key,
    lang,
    setLang,
  };
}
