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
  type ShopUiVars,
} from "@watesly-travel/shared";
import { shopFetch } from "@/lib/shop-session";
import {
  buildShopFxLookup,
  configureShopMoney,
  formatAmountInCurrency,
  formatAmountInCurrencyCompact,
} from "@/lib/shop-money";

const LOCALE_KEY = "weekendgate_locale";
const CURRENCY_KEY = "weekendgate_preferred_currency";

type FxRate = {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
};

type ShopI18nValue = {
  locale: ShopLocale;
  currency: ShopCurrency;
  dir: "rtl" | "ltr";
  setLocale: (locale: ShopLocale) => void;
  setCurrency: (currency: ShopCurrency) => void;
  t: (key: ShopUiKey, vars?: ShopUiVars) => string;
  formatKwdMinor: (kwdMinor: number) => string;
  /** Convert + format any priced amount into the selected shop currency. */
  formatMoney: (amountMinor?: number | null, fromCurrency?: string) => string;
  /** Compact one-line price for cards/tabs/calendar. */
  formatMoneyCompact: (amountMinor?: number | null, fromCurrency?: string) => string;
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
  const [baseCurrency, setBaseCurrency] = useState("KWD");
  const [rates, setRates] = useState<FxRate[]>([]);

  useEffect(() => {
    const nextLocale = readLocale();
    const nextCurrency = readCurrency();
    setLocaleState(nextLocale);
    setCurrencyState(nextCurrency);
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = localeDir(nextLocale);
  }, []);

  useEffect(() => {
    let cancelled = false;
    shopFetch<{
      displayCurrency?: string;
      rates?: FxRate[];
    }>("/shop/fx")
      .then((payload) => {
        if (cancelled) return;
        setBaseCurrency((payload.displayCurrency || "KWD").toUpperCase());
        setRates(Array.isArray(payload.rates) ? payload.rates : []);
      })
      .catch(() => {
        if (cancelled) return;
        setRates([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fxLookup = useMemo(
    () => buildShopFxLookup(baseCurrency, rates),
    [baseCurrency, rates],
  );

  // Keep module mirror in sync during render so any leftover formatMoneyMinor()
  // calls in the same pass already see the selected currency (no effect lag).
  configureShopMoney({
    preferredCurrency: currency,
    baseCurrency,
    rates,
    active: true,
  });

  useEffect(() => {
    return () => {
      configureShopMoney({
        preferredCurrency: "KWD",
        baseCurrency: "KWD",
        rates: [],
        active: false,
      });
    };
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
    // Apply immediately so the same click's re-render formats with the new currency
    // even before the next provider render body runs configureShopMoney.
    configureShopMoney({
      preferredCurrency: next,
      baseCurrency,
      rates,
      active: true,
    });
    try {
      localStorage.setItem(CURRENCY_KEY, next);
    } catch {
      /* ignore */
    }
  }, [baseCurrency, rates]);

  const value = useMemo<ShopI18nValue>(
    () => ({
      locale,
      currency,
      dir: localeDir(locale),
      setLocale,
      setCurrency,
      t: (key, vars) => tShop(locale, key, vars),
      formatKwdMinor: (kwdMinor) => formatFromKwdMinor(kwdMinor, currency, locale),
      formatMoney: (amountMinor, fromCurrency) =>
        formatAmountInCurrency(
          amountMinor,
          fromCurrency || baseCurrency,
          currency,
          fxLookup,
          baseCurrency,
        ),
      formatMoneyCompact: (amountMinor, fromCurrency) =>
        formatAmountInCurrencyCompact(
          amountMinor,
          fromCurrency || baseCurrency,
          currency,
          fxLookup,
          baseCurrency,
        ),
      locales: SHOP_LOCALES,
      currencies: SHOP_CURRENCIES,
    }),
    [locale, currency, setLocale, setCurrency, baseCurrency, fxLookup],
  );

  return <ShopI18nContext.Provider value={value}>{children}</ShopI18nContext.Provider>;
}

const FALLBACK_I18N: ShopI18nValue = {
  locale: "ar",
  currency: "KWD",
  dir: "rtl",
  setLocale: () => undefined,
  setCurrency: () => undefined,
  t: (key, vars) => tShop("ar", key, vars),
  formatKwdMinor: (kwdMinor) => formatFromKwdMinor(kwdMinor, "KWD", "ar"),
  formatMoney: (amountMinor, fromCurrency) =>
    formatAmountInCurrency(
      amountMinor,
      fromCurrency || "KWD",
      "KWD",
      buildShopFxLookup("KWD"),
      "KWD",
    ),
  formatMoneyCompact: (amountMinor, fromCurrency) =>
    formatAmountInCurrencyCompact(
      amountMinor,
      fromCurrency || "KWD",
      "KWD",
      buildShopFxLookup("KWD"),
      "KWD",
    ),
  locales: SHOP_LOCALES,
  currencies: SHOP_CURRENCIES,
};

export function useShopI18n(): ShopI18nValue {
  const ctx = useContext(ShopI18nContext);
  if (!ctx) {
    throw new Error("useShopI18n must be used within ShopI18nProvider");
  }
  return ctx;
}

/** Safe for hotel/flight cards that also render in staff dashboard (Arabic fallback). */
export function useShopCopy(): ShopI18nValue {
  return useContext(ShopI18nContext) ?? FALLBACK_I18N;
}
