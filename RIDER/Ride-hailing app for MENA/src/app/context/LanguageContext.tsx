import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, TranslationKey } from '../data/translations';

type Lang = 'en' | 'ar';

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  fontClass: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');
  const isRTL = lang === 'ar';
  const fontClass = isRTL ? 'font-cairo' : 'font-sora';

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, isRTL, setLang, t, fontClass }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
