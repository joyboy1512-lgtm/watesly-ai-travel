/** How WeekendGate picks a winner when several suppliers return the same product. */
export type AggregationMode = "cheapest" | "preferred";

export type CapabilityAggregation = {
  mode: AggregationMode;
  /** Used when mode is `preferred`. Falls back to cheapest if that supplier has no match. */
  preferredProviderKey?: string;
};

export type TravelAggregationSettings = {
  hotel: CapabilityAggregation;
  flight: CapabilityAggregation;
  transfer: CapabilityAggregation;
  activity: CapabilityAggregation;
};

export const DEFAULT_TRAVEL_AGGREGATION: TravelAggregationSettings = {
  hotel: { mode: "cheapest" },
  flight: { mode: "cheapest" },
  transfer: { mode: "cheapest" },
  activity: { mode: "cheapest" },
};

const CAPABILITIES = ["hotel", "flight", "transfer", "activity"] as const;

function parseMode(value: unknown): AggregationMode {
  return value === "preferred" ? "preferred" : "cheapest";
}

function parseCapability(value: unknown): CapabilityAggregation {
  const rec =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const preferred = String(rec.preferredProviderKey || rec.preferred || "")
    .trim()
    .toLowerCase();
  return {
    mode: parseMode(rec.mode),
    preferredProviderKey: preferred || undefined,
  };
}

export function parseTravelAggregationSettings(
  settings: unknown,
): TravelAggregationSettings {
  const root =
    settings && typeof settings === "object"
      ? (settings as Record<string, unknown>)
      : {};
  const travel =
    root.travel && typeof root.travel === "object"
      ? (root.travel as Record<string, unknown>)
      : root.aggregation && typeof root.aggregation === "object"
        ? (root.aggregation as Record<string, unknown>)
        : root;
  const agg =
    travel.aggregation && typeof travel.aggregation === "object"
      ? (travel.aggregation as Record<string, unknown>)
      : travel;

  const next: TravelAggregationSettings = {
    hotel: parseCapability(agg.hotel ?? travel.hotel),
    flight: parseCapability(agg.flight ?? travel.flight),
    transfer: parseCapability(agg.transfer ?? travel.transfer),
    activity: parseCapability(agg.activity ?? travel.activity),
  };

  // Legacy single-mode field
  if (typeof agg.mode === "string") {
    const mode = parseMode(agg.mode);
    for (const cap of CAPABILITIES) {
      if (!agg[cap]) next[cap] = { ...next[cap], mode };
    }
  }
  return next;
}

export type SupplierQuote = {
  providerKey: string;
  providerOfferRef: string;
  sellAmountMinor: number;
  costAmountMinor?: number;
  currency?: string;
};

export type AggregationMeta = {
  matchKey: string;
  mode: AggregationMode;
  winnerProvider: string;
  supplierCount: number;
  suppliers: SupplierQuote[];
};

export function aggregationScore(
  providerKey: string,
  sellAmountMinor: number,
  spec: CapabilityAggregation,
  priorityByProvider: Record<string, number> = {},
): number {
  if (spec.mode === "preferred") {
    const preferred = (spec.preferredProviderKey || "").toLowerCase();
    if (preferred && providerKey.toLowerCase() === preferred) return sellAmountMinor;
    const prio = priorityByProvider[providerKey] ?? 10_000;
    return 1_000_000_000 + prio * 10_000 + sellAmountMinor;
  }
  return sellAmountMinor;
}

export function aggregationLabelAr(meta: AggregationMeta | undefined): string {
  if (!meta || meta.supplierCount < 2) return "";
  if (meta.mode === "preferred") {
    return `عرض المزود المفضّل من ${meta.supplierCount} موردين`;
  }
  return `أفضل سعر من ${meta.supplierCount} موردين`;
}
