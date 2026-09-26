import type { InternalPriceBreakdown, MoneyMinor } from "@watesly-travel/shared";

export type PricingApplyBasis = "unit" | "booking";

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
  /**
   * unit = markup on each ticket/person or hotel room (default).
   * booking = markup once on the booking total (overall commission).
   */
  applyBasis?: PricingApplyBasis;
  /** Extra overall commission percent, applied once on the booking cost. */
  bookingCommissionPercent?: number;
  /** Extra overall commission amount in major units, applied once. */
  bookingCommissionAmount?: number;
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
  /** Tickets/persons or rooms the rule should multiply against. */
  units?: number;
  adults?: number;
  children?: number;
  rooms?: number;
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

function asFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const n = Number((value as { toNumber: () => number }).toNumber());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** A fixed rule with no amount cannot price an offer — skip it so the next rule applies. */
export function isCompletePricingRule(rule: PricingRuleInput): boolean {
  if (!rule.isActive) return false;
  if (rule.ruleType === "fixed") return asFiniteNumber(rule.fixedAmount) > 0;
  return (
    asFiniteNumber(rule.percentValue) > 0 ||
    asFiniteNumber(rule.minProfitAmount) > 0 ||
    asFiniteNumber(rule.fixedAmount) > 0
  );
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
    .filter((r) => isCompletePricingRule(r))
    .filter((r) => r.serviceType === serviceType || r.serviceType === "all")
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const aAll = a.serviceType === "all" ? 1 : 0;
      const bAll = b.serviceType === "all" ? 1 : 0;
      return aAll - bAll;
    });

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

export function pricingUnitCount(input: {
  serviceType?: string;
  applyBasis?: PricingApplyBasis | string | null;
  units?: number;
  adults?: number;
  children?: number;
  rooms?: number;
}): number {
  if (input.applyBasis === "booking") return 1;
  if (input.units && input.units > 0) return Math.max(1, Math.round(input.units));
  if ((input.serviceType || "").toLowerCase() === "hotel") {
    return Math.max(1, Math.round(input.rooms || 1));
  }
  const people = Math.round((input.adults || 0) + (input.children || 0));
  return Math.max(1, people || 1);
}

export function applyPricingRule(input: {
  costAmountMinor: MoneyMinor;
  currency: string;
  serviceType: string;
  rule: PricingRuleInput | null;
  units?: number;
  adults?: number;
  children?: number;
  rooms?: number;
}): InternalPriceBreakdown {
  const cost = Math.max(0, Math.round(asFiniteNumber(input.costAmountMinor)));
  const conditions = parseConditions(input.rule?.conditions);
  const applyBasis: PricingApplyBasis =
    conditions?.applyBasis === "booking" ? "booking" : "unit";
  const units = pricingUnitCount({
    serviceType: input.serviceType,
    applyBasis,
    units: input.units,
    adults: input.adults,
    children: input.children,
    rooms: input.rooms,
  });
  let profit = 0;
  const percent = asFiniteNumber(input.rule?.percentValue);
  const fixed = asFiniteNumber(input.rule?.fixedAmount);
  const minProfit = asFiniteNumber(input.rule?.minProfitAmount);

  if (!input.rule) {
    profit = 0;
  } else if (input.rule.ruleType === "fixed") {
    profit = Math.round(fixed) * units;
  } else if (input.rule.ruleType === "percent_with_min") {
    profit = Math.round(cost * (percent / 100));
    const min = Math.round(minProfit) * units;
    if (profit < min) profit = min;
  } else {
    // percent (default) — supports percent + fixed add-on like Saffat PERCENT_PLUS_FIXED
    profit = Math.round(cost * ((percent || 10) / 100));
    if (fixed) profit += Math.round(fixed) * units;
  }

  const commissionPercent = asFiniteNumber(conditions?.bookingCommissionPercent);
  const commissionMajor = asFiniteNumber(conditions?.bookingCommissionAmount);
  if (commissionPercent > 0) {
    profit += Math.round(cost * (commissionPercent / 100));
  }
  if (commissionMajor > 0) {
    profit += majorToMinor(commissionMajor, input.currency);
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

export function priceCostWithRules(input: {
  costAmountMinor: MoneyMinor;
  currency: string;
  serviceType: string;
  rules: PricingRuleInput[];
  context?: PricingContext;
}): InternalPriceBreakdown {
  const rule = selectPricingRule(input.rules, input.serviceType, {
    ...input.context,
    costAmountMinor: input.costAmountMinor,
  });
  return applyPricingRule({
    costAmountMinor: input.costAmountMinor,
    currency: input.currency,
    serviceType: input.serviceType,
    rule,
    units: input.context?.units,
    adults: input.context?.adults,
    children: input.context?.children,
    rooms: input.context?.rooms,
  });
}

export { parseConditions, majorToMinor };
