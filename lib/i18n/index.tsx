import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { common } from "./locales/common";
import { dashboard } from "./locales/dashboard";
import { transactions } from "./locales/transactions";
import { bankAccounts } from "./locales/bank-accounts";
import { wallets } from "./locales/wallets";
import { categories } from "./locales/categories";
import { upload } from "./locales/upload";
import { calendar } from "./locales/calendar";
import { profile } from "./locales/profile";

export type Lang = "id" | "en";

const STORAGE_KEY = "app-lang";

export const locales = {
  common,
  dashboard,
  transactions,
  bankAccounts,
  wallets,
  categories,
  upload,
  calendar,
  profile,
} as const;

type LocalesMap = typeof locales;

// Build typed translations for a given lang
function buildT(lang: Lang) {
  return Object.fromEntries(
    Object.entries(locales).map(([k, v]) => [k, v[lang]])
  ) as { [K in keyof LocalesMap]: LocalesMap[K][Lang] };
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: ReturnType<typeof buildT>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "id" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t: buildT(lang) }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
