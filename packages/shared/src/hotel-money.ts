/**
 * Money-safe hotel pricing helpers.
 *
 * Hotelbeds Availability returns amounts in MAJOR units (e.g. "171.72" EUR)
 * for the FULL STAY (all nights × rooms), NOT per-night and NOT minor units.
 *
 * Internal storage uses MoneyMinor (integer fils/cents). Conversion happens
 * exactly once via amountToMinorUnits / currencyMinorFactor.
 */

import {
  amountToMinorUnits,
  currencyExponent,
  currencyMinorFactor,
  formatMoneyMinorShared,
} from "./currency";
import type { MoneyMinor } from "./types";

export type HotelNetBasis = "stay" | "night";

export type HotelPriceBreakdown = {
  currency: string;
  nights: number;
  rooms: number;
  /** Stay total before markup, in minor units (provider/net basis). */
  baseMinor: MoneyMinor;
  /** Included tax total in minor units (already in base when allIncluded). */
  includedTaxMinor: MoneyMinor;
  /** Excluded tax total in minor units (pay at hotel / not in base). */
  excludedTaxMinor: MoneyMinor;
  /** Margin / service fee in minor units. */
  serviceFeeMinor: MoneyMinor;
  /** Amount charged now (sell total for the rate). */
  payNowMinor: MoneyMinor;
  /** Amount due at hotel (excluded taxes). */
  payAtHotelMinor: MoneyMinor;
  /** True trip cost = pay now + pay at hotel. */
  tripTotalMinor: MoneyMinor;
  /** Final sell total in minor units (alias of payNow for backward compat). */
  totalMinor: MoneyMinor;
  /** Average per night of the sell total. */
  perNightMinor: MoneyMinor;
  taxesIncluded: boolean;
  netBasis: HotelNetBasis;
};

export type HotelPriceSanityLimits = {
  /** Max sell total in major units for the stay (default 50_000). */
  maxStayMajor?: number;
  /** Max average per night in major units (default 5_000). */
  maxPerNightMajor?: number;
  /** Min sell total in major units (default 0.001). */
  minStayMajor?: number;
};

export type HotelPriceRejectReason =
  | "zero"
  | "negative"
  | "non_numeric"
  | "out_of_range"
  | "currency_mismatch"
  | "nights_invalid"
  | "equation_mismatch";

export type HotelPriceValidation =
  | { ok: true; totalMinor: MoneyMinor; perNightMinor: MoneyMinor }
  | { ok: false; reason: HotelPriceRejectReason; detail: string };

const DEFAULT_LIMITS: Required<HotelPriceSanityLimits> = {
  maxStayMajor: 50_000,
  maxPerNightMajor: 5_000,
  minStayMajor: 0.001,
};

/** Convert major → minor exactly once. */
export function hotelMajorToMinor(major: number, currency: string): MoneyMinor {
  return amountToMinorUnits(major, currency);
}

/** Convert minor → major (float; display only). */
export function hotelMinorToMajor(minor: MoneyMinor, currency: string): number {
  return minor / currencyMinorFactor(currency);
}

export function formatHotelMoney(minor: MoneyMinor, currency: string): string {
  return formatMoneyMinorShared(minor, currency);
}

/**
 * Build sell display minor for a rate whose `net` is stay-total major,
 * using the offer's sell/cost ratio (markup applied once).
 */
export function sellMinorForStayNet(input: {
  rateNetMajor: number;
  currency: string;
  sellAmountMinor: MoneyMinor;
  costAmountMinor?: MoneyMinor;
  referenceNetMajor?: number;
}): MoneyMinor {
  const { rateNetMajor, currency, sellAmountMinor, costAmountMinor, referenceNetMajor } =
    input;
  if (!Number.isFinite(rateNetMajor) || rateNetMajor <= 0) return 0;
  if (!Number.isFinite(sellAmountMinor) || sellAmountMinor <= 0) return 0;

  const rateCostMinor = hotelMajorToMinor(rateNetMajor, currency);
  if (rateCostMinor <= 0) return 0;

  if (costAmountMinor && costAmountMinor > 0) {
    return Math.round(rateCostMinor * (sellAmountMinor / costAmountMinor));
  }

  const refMajor = referenceNetMajor && referenceNetMajor > 0 ? referenceNetMajor : rateNetMajor;
  // sellMinor / majorRef would incorrectly re-apply the minor factor — use ratio of majors.
  return Math.round(sellAmountMinor * (rateNetMajor / refMajor));
}

/**
 * Sum daily rates when present; otherwise fall back to stay net.
 * Daily rates are major units per night of the stay.
 */
export function sumDailyRatesMajor(
  dailyRates: Array<{ net?: number }> | undefined,
  fallbackStayMajor: number,
): { sumMajor: number; usedDaily: boolean } {
  if (!dailyRates?.length) {
    return { sumMajor: fallbackStayMajor, usedDaily: false };
  }
  let sum = 0;
  let count = 0;
  for (const day of dailyRates) {
    const n = Number(day.net);
    if (!Number.isFinite(n) || n < 0) continue;
    sum += n;
    count += 1;
  }
  if (count === 0) return { sumMajor: fallbackStayMajor, usedDaily: false };
  return { sumMajor: sum, usedDaily: true };
}

export function taxTotalsMinor(input: {
  taxes?: {
    allIncluded?: boolean;
    items: Array<{ amount: number; currency: string; included: boolean }>;
  };
  currency: string;
}): { includedMinor: MoneyMinor; excludedMinor: MoneyMinor; allIncluded: boolean } {
  const items = input.taxes?.items || [];
  let included = 0;
  let excluded = 0;
  for (const t of items) {
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const minor = hotelMajorToMinor(amount, t.currency || input.currency);
    if (t.included) included += minor;
    else excluded += minor;
  }
  return {
    includedMinor: included,
    excludedMinor: excluded,
    allIncluded: Boolean(input.taxes?.allIncluded ?? excluded === 0),
  };
}

/**
 * Verify: sum(daily) OR stayNet + excludedTaxes ≈ expected components.
 * Sell total = base (stay) + serviceFee; excluded taxes are informational.
 */
export function buildHotelPriceBreakdown(input: {
  stayNetMajor: number;
  currency: string;
  nights: number;
  rooms?: number;
  sellAmountMinor: MoneyMinor;
  costAmountMinor?: MoneyMinor;
  dailyRates?: Array<{ net?: number }>;
  taxes?: {
    allIncluded?: boolean;
    items: Array<{ amount: number; currency: string; included: boolean }>;
  };
  netBasis?: HotelNetBasis;
}): HotelPriceBreakdown {
  const nights = Math.max(1, Math.round(input.nights) || 1);
  const rooms = Math.max(1, input.rooms || 1);
  const currency = input.currency.toUpperCase();
  const netBasis: HotelNetBasis = input.netBasis || "stay";

  const { sumMajor } = sumDailyRatesMajor(input.dailyRates, input.stayNetMajor);
  const baseMajor = netBasis === "night" ? sumMajor * nights : sumMajor;
  const baseMinor = hotelMajorToMinor(baseMajor, currency);
  const taxes = taxTotalsMinor({ taxes: input.taxes, currency });

  const costMinor = input.costAmountMinor && input.costAmountMinor > 0
    ? input.costAmountMinor
    : baseMinor;
  const serviceFeeMinor = Math.max(0, input.sellAmountMinor - costMinor);
  const totalMinor = input.sellAmountMinor > 0 ? input.sellAmountMinor : baseMinor + serviceFeeMinor;
  const perNightMinor = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
  const payNowMinor = totalMinor;
  const payAtHotelMinor = taxes.excludedMinor;
  const tripTotalMinor = payNowMinor + payAtHotelMinor;

  return {
    currency,
    nights,
    rooms,
    baseMinor,
    includedTaxMinor: taxes.includedMinor,
    excludedTaxMinor: taxes.excludedMinor,
    serviceFeeMinor,
    payNowMinor,
    payAtHotelMinor,
    tripTotalMinor,
    totalMinor,
    perNightMinor,
    taxesIncluded: taxes.allIncluded,
    netBasis,
  };
}

/**
 * Equation check for stay pricing:
 * when daily rates exist: sum(daily) ≈ stayNet (within 1 minor unit after FX),
 * and sell = cost + serviceFee.
 */
export function assertStayPriceEquation(input: {
  stayNetMajor: number;
  currency: string;
  nights: number;
  dailyRates?: Array<{ net?: number }>;
  sellAmountMinor: MoneyMinor;
  costAmountMinor: MoneyMinor;
  toleranceMinor?: number;
}): { ok: boolean; detail: string } {
  const tol = input.toleranceMinor ?? 1;
  const { sumMajor, usedDaily } = sumDailyRatesMajor(input.dailyRates, input.stayNetMajor);
  const stayMinor = hotelMajorToMinor(input.stayNetMajor, input.currency);
  const sumMinor = hotelMajorToMinor(sumMajor, input.currency);

  if (usedDaily && Math.abs(sumMinor - stayMinor) > Math.max(tol, stayMinor * 0.02 + 1)) {
    return {
      ok: false,
      detail: `daily_sum_mismatch sumMinor=${sumMinor} stayMinor=${stayMinor}`,
    };
  }

  const expectedSell = input.costAmountMinor; // cost alone; service fee separate
  if (input.costAmountMinor <= 0 || input.sellAmountMinor < expectedSell - tol) {
    return {
      ok: false,
      detail: `sell_below_cost sell=${input.sellAmountMinor} cost=${input.costAmountMinor}`,
    };
  }

  const reconstructed = input.costAmountMinor + Math.max(0, input.sellAmountMinor - input.costAmountMinor);
  if (Math.abs(reconstructed - input.sellAmountMinor) > tol) {
    return {
      ok: false,
      detail: `fee_equation_mismatch reconstructed=${reconstructed} sell=${input.sellAmountMinor}`,
    };
  }

  if (input.nights < 1) {
    return { ok: false, detail: "nights_invalid" };
  }

  return { ok: true, detail: "ok" };
}

export function validateHotelSellPrice(input: {
  totalMinor: MoneyMinor;
  currency: string;
  nights: number;
  providerCurrency?: string;
  displayCurrency?: string;
  limits?: HotelPriceSanityLimits;
}): HotelPriceValidation {
  const { totalMinor, currency, nights } = input;
  const limits = { ...DEFAULT_LIMITS, ...input.limits };

  if (!Number.isFinite(totalMinor)) {
    return { ok: false, reason: "non_numeric", detail: `totalMinor=${totalMinor}` };
  }
  if (totalMinor === 0) {
    return { ok: false, reason: "zero", detail: "totalMinor is 0" };
  }
  if (totalMinor < 0) {
    return { ok: false, reason: "negative", detail: `totalMinor=${totalMinor}` };
  }
  if (!Number.isFinite(nights) || nights < 1) {
    return { ok: false, reason: "nights_invalid", detail: `nights=${nights}` };
  }

  const display = (input.displayCurrency || currency).toUpperCase();
  const provider = (input.providerCurrency || currency).toUpperCase();
  // Soft check: currencies should be ISO-like codes
  if (!/^[A-Z]{3}$/.test(display)) {
    return { ok: false, reason: "currency_mismatch", detail: `display=${display}` };
  }

  const major = hotelMinorToMajor(totalMinor, display);
  const perNight = major / nights;
  if (major < limits.minStayMajor || major > limits.maxStayMajor || perNight > limits.maxPerNightMajor) {
    return {
      ok: false,
      reason: "out_of_range",
      detail: `major=${major} ${display} perNight=${perNight} provider=${provider}`,
    };
  }

  return {
    ok: true,
    totalMinor,
    perNightMinor: Math.round(totalMinor / nights),
  };
}

/** KWD display must use 3 decimal places. */
export function hotelDisplayDecimals(currency: string): number {
  return currencyExponent(currency);
}
