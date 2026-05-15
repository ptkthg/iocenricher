import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getLang, setLang as storeLang, t as translate, LANGS } from "../lib/i18n";

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(getLang);

  useEffect(() => {
    function onLangChange() { setLangState(getLang()); }
    window.addEventListener("langchange", onLangChange);
    return () => window.removeEventListener("langchange", onLangChange);
  }, []);

  const setLang = useCallback((l) => { storeLang(l); setLangState(l); }, []);
  const T = useCallback((path) => translate(lang, path), [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, T, LANGS }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
