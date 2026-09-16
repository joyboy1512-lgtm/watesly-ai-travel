/** Mock search — opt-in via NEXT_PUBLIC_WG_TRIP_USE_MOCK=1 (off in production by default) */
import type { TripDraftState, TripSearchResult, TripServiceKind } from "@watesly-travel/shared";
import { buildPackageOptions, mergeSearchSlices } from "@watesly-travel/shared";

export function tripUseMock(): boolean {
  const flag = process.env.NEXT_PUBLIC_WG_TRIP_USE_MOCK;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export async function mockTripSearch(draft: TripDraftState): Promise<TripSearchResult> {
  await delay(400 + Math.random() * 400);
  const dest = draft.flight.destinationLabel || "دبي";
  const slices = draft.services.map((kind) => mockSlice(kind, dest));
  const base: Partial<
    Record<TripServiceKind, { offers: { id: string; label: string; sellAmountMinor: number; currency: string }[] }>
  > = {};
  for (const s of slices) {
    if (s.offers.length) base[s.kind] = { offers: s.offers };
  }
  const merged = mergeSearchSlices(draft.sessionId, slices);
  merged.options = buildPackageOptions(draft, base);
  return merged;
}

function mockSlice(kind: TripServiceKind, dest: string) {
  const currency = "KWD";
  if (kind === "flight") {
    return {
      kind,
      status: "ok" as const,
      offers: [
        { id: "fl-budget", label: `رحلة اقتصادية · ${dest}`, sellAmountMinor: 89_000, currency },
        { id: "fl-balanced", label: `رحلة متوازنة · ${dest}`, sellAmountMinor: 95_000, currency },
        { id: "fl-comfort", label: `رحلة مريحة · ${dest}`, sellAmountMinor: 118_000, currency },
      ],
    };
  }
  if (kind === "hotel") {
    return {
      kind,
      status: "ok" as const,
      offers: [
        { id: "ht-budget", label: `فندق 3★ · ${dest}`, sellAmountMinor: 165_000, currency },
        { id: "ht-balanced", label: `Atlantis The Palm`, sellAmountMinor: 210_000, currency },
        { id: "ht-comfort", label: `فندق فاخر 5★`, sellAmountMinor: 285_000, currency },
      ],
    };
  }
  if (kind === "transfer") {
    return {
      kind,
      status: "ok" as const,
      offers: [
        { id: "tr-1", label: "استقبال مطار → فندق", sellAmountMinor: 18_000, currency },
        { id: "tr-2", label: "سيارة عائلية ذهاب وعودة", sellAmountMinor: 28_000, currency },
      ],
    };
  }
  return {
    kind,
    status: "ok" as const,
    offers: [
      { id: "ac-1", label: "برج خليفة", sellAmountMinor: 12_000, currency },
      { id: "ac-2", label: "سفاري صحراوي", sellAmountMinor: 22_000, currency },
      { id: "ac-3", label: "جولة دبي", sellAmountMinor: 15_000, currency },
    ],
  };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
