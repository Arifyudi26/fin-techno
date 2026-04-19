import { createContext, useContext, useState, useEffect } from "react";
import type { Lang } from "./translations";

type LangContextType = { lang: Lang; setLang: (l: Lang) => void };

const LangContext = createContext<LangContextType>({ lang: "id", setLang: () => {} });

export function DocsLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem("docs-lang") as Lang | null;
    if (saved === "en" || saved === "id") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem("docs-lang", l);
    setLangState(l);
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const useDocsLang = () => useContext(LangContext);
