import type { RepriceStatus, TripOfferSummary, TripServiceKind } from "./types";

export type RepriceLine = {
  kind: TripServiceKind;
  oldMinor: number;
  newMinor: number;
  currency: string;
  status: RepriceStatus;
  message?: string;
};

export type RepriceResult = {
  status: RepriceStatus;
  lines: RepriceLine[];
  totalOldMinor: number;
  totalNewMinor: number;
  currency: string;
  requiresApproval: boolean;
};

export function buildRepriceResult(
  before: Partial<Record<TripServiceKind, TripOfferSummary>>,
  after: Partial<Record<TripServiceKind, TripOfferSummary>>,
): RepriceResult {
  const kinds = new Set([
    ...Object.keys(before),
    ...Object.keys(after),
  ]) as Set<TripServiceKind>;

  const lines: RepriceLine[] = [];
  let totalOld = 0;
  let totalNew = 0;
  let currency = "KWD";
  let requiresApproval = false;
  let worst: RepriceStatus = "verified";

  for (const kind of kinds) {
    const b = before[kind];
    const a = after[kind];
    if (!b && !a) continue;
    const oldMinor = b?.sellAmountMinor ?? 0;
    const newMinor = a?.sellAmountMinor ?? 0;
    currency = a?.currency || b?.currency || currency;
    totalOld += oldMinor;
    totalNew += newMinor;

    let status: RepriceStatus = "verified";
    let message: string | undefined;
    if (!a) {
      status = "unavailable";
      message = "لم يعد العرض متاحًا";
      worst = "unavailable";
    } else if (newMinor > oldMinor) {
      status = "price_changed";
      message = "تغيّر السعر";
      requiresApproval = true;
      if (worst === "verified") worst = "price_changed";
    } else if (newMinor < oldMinor) {
      status = "verified";
      message = "السعر أفضل";
    }

    lines.push({ kind, oldMinor, newMinor, currency, status, message });
  }

  return {
    status: worst,
    lines,
    totalOldMinor: totalOld,
    totalNewMinor: totalNew,
    currency,
    requiresApproval,
  };
}
