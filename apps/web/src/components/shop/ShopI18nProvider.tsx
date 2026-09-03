"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  SHOP_CURRENCIES,
  SHOP_LOCALES,
  formatFromKwdMinor,
  localeDir,
  tShop,
  type ShopCurrency,
  type ShopLocale,
  type ShopUiKey,
} from "@watesly-travel/shared";

const LOCALE_KEY = "weekendgate_locale";
const CURRENCY_KEY = "weekendgate_preferred_currency";

type ShopI18nValue = {
  locale: ShopLocale;
  currency: ShopCurrency;
  dir: "rtl" | "ltr";
  setLocale: (locale: ShopLocale) => void;
  setCurrency: (currency: ShopCurrency) => void;
  t: (key: ShopUiKey) => string;
  formatKwdMinor: (kwdMinor: number) => string;
  locales: readonly ShopLocale[];
  currencies: readonly ShopCurrency[];
};

const ShopI18nContext = createContext<ShopI18nValue | null>(null);

function readLocale(): ShopLocale {
  if (typeof window === "undefined") return "ar";
  try {
    const v = localStorage.getItem(LOCALE_KEY);
    if (v === "en" || v === "ar") return v;
  } catch {
    /* ignore */
  }
  return "ar";
}

function readCurrency(): ShopCurrency {
  if (typeof window === "undefined") return "KWD";
  try {
    const v = (localStorage.getItem(CURRENCY_KEY) || "KWD").toUpperCase();
    if ((SHOP_CURRENCIES as readonly string[]).includes(v)) return v as ShopCurrency;
  } catch {
    /* ignore */
  }
  return "KWD";
}

export function ShopI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ShopLocale>("ar");
  const [currency, setCurrencyState] = useState<ShopCurrency>("KWD");

  useEffect(() => {
    const nextLocale = readLocale();
    const nextCurrency = readCurrency();
    setLocaleState(nextLocale);
    setCurrencyState(nextCurrency);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = localeDir(nextLocale);
  }, []);

  const setLocale = useCallback((next: ShopLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
    document.documentElement.dir = localeDir(next);
  }, []);

  const setCurrency = useCallback((next: ShopCurrency) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ShopI18nValue>(
    () => ({
      locale,
      currency,
      dir: localeDir(locale),
      setLocale,
      setCurrency,
      t: (key) => tShop("ar", key),
      formatKwdMinor: (kwdMinor) => formatFromKwdMinor(kwdMinor, currency, locale),
      locales: SHOP_LOCALES,
      currencies: SHOP_CURRENCIES,
    }),
    [locale, currency, setLocale, setCurrency],
  );

  return <ShopI18nContext.Provider value={value}>{children}</ShopI18nContext.Provider>;
}

export function useShopI18n(): ShopI18nValue {
  const ctx = useContext(ShopI18nContext);
  if (!ctx) {
    throw new Error("useShopI18n must be used within ShopI18nProvider");
  }
  return ctx;
}
