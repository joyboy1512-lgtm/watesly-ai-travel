import type { InternalPriceBreakdown, MoneyMinor } from "@watesly-travel/shared";

export type PricingConditions = {
  origins?: string[];
  destinations?: string[];
  cabinClasses?: string[];
  /** Hotel star ratings as "1".."5" */
  hotelStars?: string[];
  providers?: string[];
  /** Major units in rule currency (e.g. 50 KWD) */
  minPrice?: number;
  maxPrice?: number;
  dateFrom?: string;
  dateTo?: string;
};

export type PricingContext = {
  origin?: string;
  destination?: string;
  cabinClass?: string;
  /** Hotel star rating (number or string) */
  stars?: number | string;
  departDate?: string;
  checkIn?: string;
  city?: string;
  provider?: string;
};

export interface PricingRuleInput {
  id: string;
  name?: string;
  serviceType: string;
  ruleType: "percent" | "fixed" | "percent_with_min" | string;
  percentValue?: number | null;
  fixedAmount?: number | null;
  minProfitAmount?: number | null;
  currency: string;
  isActive: boolean;
  priority: number;
  /** Parsed object, JSON string, or DB JsonValue */
  conditions?: PricingConditions | null | unknown;
}

function currencyExponent(currency: string): number {
  const c = currency.toUpperCase();
  return c === "KWD" || c === "BHD" || c === "OMR" || c === "JOD" ? 3 : 2;
}

function majorToMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyExponent(currency));
}

function normalizeCode(value?: string | null): string | undefined {
  const v = value?.trim().toUpperCase();
  return v || undefined;
}

function parseConditions(raw: unknown): PricingConditions | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as PricingConditions;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as PricingConditions;
  return null;
}

function dateInRange(date: string | undefined, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  if (!date) return true;
  const d = date.slice(0, 10);
  if (from && d < from.slice(0, 10)) return false;
  if (to && d > to.slice(0, 10)) return false;
  return true;
}

function listIncludes(list: string[] | undefined, value?: string): boolean {
  if (!list?.length) return true;
  if (!value) return true;
  const needle = value.toUpperCase();
  return list.some((item) => item.trim().toUpperCase() === needle);
}

export function matchesPricingConditions(
  conditions: PricingConditions | null | undefined,
  costAmountMinor: MoneyMinor,
  context: PricingContext,
  currency: string,
): boolean {
  const c = conditions ?? null;
  if (!c) return true;

  if (!listIncludes(c.origins, normalizeCode(context.origin))) return false;

  const dest = normalizeCode(context.destination) || normalizeCode(context.city);
  if (!listIncludes(c.destinations, dest)) return false;

  if (!listIncludes(c.cabinClasses, normalizeCode(context.cabinClass))) return false;
  const stars =
    context.stars == null || context.stars === ""
      ? undefined
      : String(context.stars);
  if (!listIncludes(c.hotelStars, normalizeCode(stars))) return false;
  if (!listIncludes(c.providers, normalizeCode(context.provider))) return false;

  if (c.minPrice != null && costAmountMinor < majorToMinor(c.minPrice, currency)) {
    return false;
  }
  if (c.maxPrice != null && costAmountMinor > majorToMinor(c.maxPrice, currency)) {
    return false;
  }

  const travelDate = context.departDate || context.checkIn;
  if (!dateInRange(travelDate, c.dateFrom, c.dateTo)) return false;

  return true;
}

/**
 * First matching active rule by priority (lower number wins).
 * Optional context enables route/cabin/provider/date/price conditions (Saffat-style).
 */
export function selectPricingRule(
  rules: PricingRuleInput[],
  serviceType: string,
  context?: PricingContext & { costAmountMinor?: MoneyMinor },
): PricingRuleInput | null {
  const active = rules
    .filter((r) => r.isActive)
    .filter((r) => r.serviceType === serviceType || r.serviceType === "all")
    .sort((a, b) => a.priority - b.priority);

  if (!context) return active[0] ?? null;

  for (const rule of active) {
    const conditions = parseConditions(rule.conditions);
    if (
      matchesPricingConditions(
        conditions,
        context.costAmountMinor ?? 0,
        context,
        rule.currency,
      )
    ) {
      return rule;
    }
  }

  return null;
}

export function applyPricingRule(input: {
  costAmountMinor: MoneyMinor;
  currency: string;
  serviceType: string;
  rule: PricingRuleInput | null;
}): InternalPriceBreakdown {
  const cost = Math.max(0, Math.round(input.costAmountMinor));
  let profit = 0;

  if (!input.rule) {
    profit = Math.round(cost * 0.1);
  } else if (input.rule.ruleType === "fixed") {
    profit = Math.round(input.rule.fixedAmount ?? 0);
  } else if (input.rule.ruleType === "percent_with_min") {
    profit = Math.round(cost * ((input.rule.percentValue ?? 0) / 100));
    const min = Math.round(input.rule.minProfitAmount ?? 0);
    if (profit < min) profit = min;
  } else {
    // percent (default) — supports percent + fixed add-on like Saffat PERCENT_PLUS_FIXED
    profit = Math.round(cost * ((input.rule.percentValue ?? 10) / 100));
    if (input.rule.fixedAmount) {
      profit += Math.round(input.rule.fixedAmount);
    }
  }

  const sell = cost + profit;
  return {
    costAmountMinor: cost,
    sellAmountMinor: sell,
    profitAmountMinor: profit,
    currency: input.currency,
    pricingRuleId: input.rule?.id,
    pricingRuleName: input.rule?.name,
  };
}

/** Strip internal pricing fields before customer payloads. */
export function toCustomerVisible(input: {
  sellAmountMinor: MoneyMinor;
  currency: string;
  summary: string;
  expiresAt?: string;
}) {
  return {
    sellAmountMinor: input.sellAmountMinor,
    currency: input.currency,
    summary: input.summary,
    expiresAt: input.expiresAt,
  };
}

export { parseConditions };
