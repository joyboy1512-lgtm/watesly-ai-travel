import {
  buildFxLookup,
  convertMinorAmount,
  defaultRatesToCurrency,
  formatMoneyMinorShared,
  currencyExponent,
  currencyMinorFactor,
  SUPPORTED_CURRENCIES,
  type FxRateLookup,
  type FxRatePair,
} from "@watesly-travel/shared";

type ShopMoneyState = {
  preferredCurrency: string;
  baseCurrency: string;
  lookup: FxRateLookup;
  active: boolean;
};

let state: ShopMoneyState = {
  preferredCurrency: "KWD",
  baseCurrency: "KWD",
  lookup: buildFxLookup(defaultRatesToCurrency("KWD")),
  active: false,
};

export function buildShopFxLookup(
  baseCurrency: string,
  rates?: FxRatePair[] | null,
): FxRateLookup {
  const base = (baseCurrency || "KWD").toUpperCase();
  const pairs =
    rates && rates.length ? rates : defaultRatesToCurrency(base);
  return buildFxLookup(pairs);
}

/** Convert using an explicit preferred currency + lookup (React-safe, no module lag). */
export function convertAmountToCurrency(
  amountMinor: number,
  fromCurrency: string | null | undefined,
  preferredCurrency: string,
  lookup: FxRateLookup,
  baseCurrency = "KWD",
): { amountMinor: number; currency: string } {
  const from = (fromCurrency || baseCurrency || "KWD").toUpperCase();
  const to = (preferredCurrency || baseCurrency || "KWD").toUpperCase();
  if (from === to) {
    return { amountMinor: Math.round(amountMinor), currency: from };
  }
  return {
    amountMinor: convertMinorAmount(amountMinor, from, to, lookup),
    currency: to,
  };
}

export function formatAmountInCurrency(
  amountMinor: number | null | undefined,
  fromCurrency: string | null | undefined,
  preferredCurrency: string,
  lookup: FxRateLookup,
  baseCurrency = "KWD",
): string {
  if (amountMinor == null) return "—";
  const converted = convertAmountToCurrency(
    amountMinor,
    fromCurrency,
    preferredCurrency,
    lookup,
    baseCurrency,
  );
  return formatMoneyMinorShared(converted.amountMinor, converted.currency);
}

export function formatAmountInCurrencyCompact(
  amountMinor: number | null | undefined,
  fromCurrency: string | null | undefined,
  preferredCurrency: string,
  lookup: FxRateLookup,
  baseCurrency = "KWD",
): string {
  if (amountMinor == null) return "—";
  const converted = convertAmountToCurrency(
    amountMinor,
    fromCurrency,
    preferredCurrency,
    lookup,
    baseCurrency,
  );
  const code = converted.currency;
  const exp = currencyExponent(code);
  const major = converted.amountMinor / currencyMinorFactor(code);
  const meta = SUPPORTED_CURRENCIES.find((c) => c.code === code);
  const symbol = meta?.symbol || code;
  return `${major.toFixed(exp)} ${symbol}`;
}

/** Called by ShopI18nProvider so legacy formatMoneyMinor() converts too. */
export function configureShopMoney(input: {
  preferredCurrency: string;
  baseCurrency?: string;
  rates?: FxRatePair[];
  active?: boolean;
}) {
  const preferred = (input.preferredCurrency || "KWD").toUpperCase();
  const base = (input.baseCurrency || preferred || "KWD").toUpperCase();
  state = {
    preferredCurrency: preferred,
    baseCurrency: base,
    lookup: buildShopFxLookup(base, input.rates),
    active: input.active !== false,
  };
}

export function getShopPreferredCurrency() {
  return state.preferredCurrency;
}

export function isShopMoneyActive() {
  return state.active;
}

/** Convert an amount already priced in `fromCurrency` into the shop preferred currency. */
export function convertToShopCurrency(
  amountMinor: number,
  fromCurrency?: string | null,
): { amountMinor: number; currency: string } {
  if (!state.active) {
    const from = (fromCurrency || state.baseCurrency || "KWD").toUpperCase();
    return { amountMinor: Math.round(amountMinor), currency: from };
  }
  return convertAmountToCurrency(
    amountMinor,
    fromCurrency,
    state.preferredCurrency,
    state.lookup,
    state.baseCurrency,
  );
}

export function formatShopMoneyMinor(
  amountMinor?: number | null,
  fromCurrency?: string | null,
) {
  if (amountMinor == null) return "—";
  const converted = convertToShopCurrency(amountMinor, fromCurrency);
  return formatMoneyMinorShared(converted.amountMinor, converted.currency);
}
