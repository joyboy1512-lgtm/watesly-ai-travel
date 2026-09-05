const COST_KEYS = new Set([
  "totalCostAmount",
  "totalProfitAmount",
  "costAmount",
  "profitAmount",
  "pricingBreakdown",
  "rawOfferSnapshot",
]);

import { formatMoneyMinorShared } from "@watesly-travel/shared";

export function formatMoneyMinor(
  amountMinor: number,
  currency = "KWD",
): string {
  return formatMoneyMinorShared(amountMinor, currency);
}

export function stripCostFields<T>(row: T, canViewCost: boolean): T {
  if (canViewCost || row == null) return row;

  if (Array.isArray(row)) {
    return row.map((item) => stripCostFields(item, canViewCost)) as T;
  }

  if (typeof row !== "object") return row;

  const clone: Record<string, unknown> = {
    ...(row as Record<string, unknown>),
  };

  for (const key of Object.keys(clone)) {
    if (COST_KEYS.has(key)) {
      delete clone[key];
      continue;
    }
    const value = clone[key];
    if (value && typeof value === "object") {
      clone[key] = stripCostFields(value, canViewCost);
    }
  }

  return clone as T;
}

export function sanitizeWhatsAppAccount<T extends Record<string, unknown>>(
  account: T,
): Omit<T, "accessTokenEnc"> & { hasAccessToken: boolean } {
  const { accessTokenEnc, ...rest } = account;
  return {
    ...(rest as Omit<T, "accessTokenEnc">),
    hasAccessToken: Boolean(accessTokenEnc),
  };
}
