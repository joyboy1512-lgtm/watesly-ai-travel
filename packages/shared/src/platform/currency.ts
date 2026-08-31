/** Display FX — base KWD. Update rates periodically or via env CMS. */
export type ShopCurrency = "KWD" | "USD" | "EUR" | "SAR" | "AED" | "BHD" | "OMR" | "QAR";

export const SHOP_CURRENCIES: ShopCurrency[] = [
  "KWD",
  "SAR",
  "AED",
  "BHD",
  "OMR",
  "QAR",
  "USD",
  "EUR",
];

/** Approximate mid-market multipliers: 1 KWD → target */
export const KWD_TO: Record<ShopCurrency, number> = {
  KWD: 1,
  USD: 3.26,
  EUR: 3.01,
  SAR: 12.23,
  AED: 11.97,
  BHD: 1.23,
  OMR: 1.25,
  QAR: 11.87,
};

export const CURRENCY_FRACTION: Record<ShopCurrency, number> = {
  KWD: 3,
  BHD: 3,
  OMR: 3,
  USD: 2,
  EUR: 2,
  SAR: 2,
  AED: 2,
  QAR: 2,
};

export const CURRENCY_SYMBOL: Record<ShopCurrency, string> = {
  KWD: "د.ك",
  USD: "$",
  EUR: "€",
  SAR: "ر.س",
  AED: "د.إ",
  BHD: "د.ب",
  OMR: "ر.ع",
  QAR: "ر.ق",
};

/** WeekendGate stores money as fils (1/1000 KWD). */
export function convertKwdMinorTo(
  kwdMinor: number,
  currency: ShopCurrency,
): number {
  const kwd = kwdMinor / 1000;
  const major = kwd * KWD_TO[currency];
  const frac = CURRENCY_FRACTION[currency];
  return Math.round(major * 10 ** frac);
}

export function formatMoneyMinor(
  amountMinor: number,
  currency: ShopCurrency,
  locale: "ar" | "en" = "ar",
): string {
  const frac = CURRENCY_FRACTION[currency];
  const major = amountMinor / 10 ** frac;
  const formatted = major.toLocaleString(locale === "ar" ? "ar-KW" : "en-US", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });
  const sym = CURRENCY_SYMBOL[currency];
  return locale === "ar" ? `${formatted} ${sym}` : `${sym}${formatted}`;
}

export function formatFromKwdMinor(
  kwdMinor: number,
  currency: ShopCurrency,
  locale: "ar" | "en" = "ar",
): string {
  if (currency === "KWD") {
    return formatMoneyMinor(kwdMinor, "KWD", locale);
  }
  return formatMoneyMinor(convertKwdMinorTo(kwdMinor, currency), currency, locale);
}
