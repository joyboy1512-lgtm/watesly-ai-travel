import {
  buildFxLookup,
  convertMinorAmount,
  defaultRatesToCurrency,
  formatMoneyMinorShared,
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

/** Called by ShopI18nProvider so shop price formatting converts to the selected currency. */
export function configureShopMoney(input: {
  preferredCurrency: string;
  baseCurrency?: string;
  rates?: FxRatePair[];
  active?: boolean;
}) {
  const preferred = (input.preferredCurrency || "KWD").toUpperCase();
  const base = (input.baseCurrency || preferred || "KWD").toUpperCase();
  const pairs =
    input.rates && input.rates.length
      ? input.rates
      : defaultRatesToCurrency(base);
  state = {
    preferredCurrency: preferred,
    baseCurrency: base,
    lookup: buildFxLookup(pairs),
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
  const from = (fromCurrency || state.baseCurrency || "KWD").toUpperCase();
  const to = state.preferredCurrency;
  if (!state.active || from === to) {
    return { amountMinor: Math.round(amountMinor), currency: from };
  }
  return {
    amountMinor: convertMinorAmount(amountMinor, from, to, state.lookup),
    currency: to,
  };
}

export function formatShopMoneyMinor(
  amountMinor?: number | null,
  fromCurrency?: string | null,
) {
  if (amountMinor == null) return "—";
  const converted = convertToShopCurrency(amountMinor, fromCurrency);
  return formatMoneyMinorShared(converted.amountMinor, converted.currency);
}
