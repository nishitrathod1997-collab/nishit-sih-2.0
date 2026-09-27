import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext({
  lang: 'EN',
  setLang: () => {}
});

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('stms_lang') || 'EN';
    } catch {
      return 'EN';
    }
  });

  const setLang = (newLang) => {
    setLangState(prev => {
      const resolved = typeof newLang === 'function' ? newLang(prev) : newLang;
      try {
        localStorage.setItem('stms_lang', resolved);
      } catch {}
      return resolved;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem('stms_lang', lang);
    } catch {}
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
