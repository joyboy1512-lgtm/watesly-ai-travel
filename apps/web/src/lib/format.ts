import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencyExponent,
  currencyMinorFactor,
  formatMoneyMinorShared,
} from "@watesly-travel/shared";

export function formatMoneyMinor(
  amountMinor?: number | null,
  currency: string = DEFAULT_CURRENCY,
) {
  return formatMoneyMinorShared(amountMinor, currency);
}

/** One-line price for cards: "12.500 د.ك" */
export function formatMoneyMinorCompact(
  amountMinor?: number | null,
  currency: string = DEFAULT_CURRENCY,
) {
  if (amountMinor == null) return "—";
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  const exp = currencyExponent(code);
  const major = amountMinor / currencyMinorFactor(code);
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  const symbol = meta?.symbol || code;
  return `${major.toFixed(exp)} ${symbol}`;
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ar-KW");
}
