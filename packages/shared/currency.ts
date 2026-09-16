/** ISO 4217 minor-unit exponents used for MoneyMinor storage. */
const CURRENCY_EXPONENTS: Record<string, number> = {
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
  TND: 3,
  IQD: 3,
  LYD: 3,
  CLF: 4,
  UYW: 4,
};

export const DEFAULT_CURRENCY = "KWD" as const;

export const DEFAULT_TIMEZONE = "Asia/Kuwait" as const;

export const SUPPORTED_CURRENCIES = [
  { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
  { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
  { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
  { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
  { code: "BHD", label: "دينار بحريني", symbol: "د.ب" },
  { code: "OMR", label: "ريال عماني", symbol: "ر.ع" },
  { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
  { code: "USD", label: "دولار أمريكي", symbol: "$" },
  { code: "EUR", label: "يورو", symbol: "€" },
] as const;

export type SupportedCurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number]["code"];

export function currencyExponent(currency: string = DEFAULT_CURRENCY): number {
  const code = currency.trim().toUpperCase();
  return CURRENCY_EXPONENTS[code] ?? 2;
}

export function currencyMinorFactor(currency: string = DEFAULT_CURRENCY): number {
  return 10 ** currencyExponent(currency);
}

export function amountToMinorUnits(
  amount: string | number,
  currency: string = DEFAULT_CURRENCY,
): number {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * currencyMinorFactor(currency));
}

export function formatMoneyMinorShared(
  amountMinor?: number | null,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (amountMinor == null) return "—";
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const exp = currencyExponent(code);
  const major = amountMinor / currencyMinorFactor(code);
  return `${major.toFixed(exp)} ${code}`;
}

export function isSupportedCurrency(code: string): boolean {
  const upper = code.trim().toUpperCase();
  return SUPPORTED_CURRENCIES.some((c) => c.code === upper);
}
