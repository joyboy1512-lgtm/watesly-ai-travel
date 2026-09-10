import {
  DEFAULT_CURRENCY,
  SUPPORTED_CURRENCIES,
  currencyExponent,
  currencyMinorFactor,
  formatMoneyMinorShared,
} from "@watesly-travel/shared";
import {
  formatShopMoneyMinor,
  isShopMoneyActive,
  convertToShopCurrency,
} from "./shop-money";

export function formatMoneyMinor(
  amountMinor?: number | null,
  currency: string = DEFAULT_CURRENCY,
) {
  if (isShopMoneyActive()) {
    return formatShopMoneyMinor(amountMinor, currency);
  }
  return formatMoneyMinorShared(amountMinor, currency);
}

/** One-line price for cards: "12.500 د.ك" */
export function formatMoneyMinorCompact(
  amountMinor?: number | null,
  currency: string = DEFAULT_CURRENCY,
) {
  if (amountMinor == null) return "—";
  const source = currency || DEFAULT_CURRENCY;
  const converted = isShopMoneyActive()
    ? convertToShopCurrency(amountMinor, source)
    : { amountMinor, currency: source.toUpperCase() };
  const code = converted.currency;
  const exp = currencyExponent(code);
  const major = converted.amountMinor / currencyMinorFactor(code);
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
