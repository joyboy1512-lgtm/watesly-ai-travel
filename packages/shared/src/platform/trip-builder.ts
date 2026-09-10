import {
  type PackageComponent,
  type PackageDraft,
  packageTotal,
} from "../package-compose";

export type TripPriceBreakdown = {
  originalMinor: number;
  discountMinor: number;
  savingsMinor: number;
  taxesMinor: number;
  feesMinor: number;
  pointsRedeemedMinor: number;
  finalMinor: number;
  currency: string;
};

/** Bundle discount: 5% when 2+ services, 8% when 3+, 12% when all 4 kinds. */
export function computeBundleDiscount(components: PackageComponent[]): number {
  const kinds = new Set(components.map((c) => c.kind));
  const total = packageTotal(components);
  if (kinds.size >= 4) return Math.round(total * 0.12);
  if (kinds.size >= 3) return Math.round(total * 0.08);
  if (kinds.size >= 2) return Math.round(total * 0.05);
  return 0;
}

export function buildTripPriceBreakdown(
  components: PackageComponent[],
  opts?: {
    taxesMinor?: number;
    feesMinor?: number;
    pointsRedeemedMinor?: number;
    currency?: string;
  },
): TripPriceBreakdown {
  const originalMinor = packageTotal(components);
  const discountMinor = computeBundleDiscount(components);
  const savingsMinor = discountMinor;
  const taxesMinor = Math.max(0, opts?.taxesMinor ?? Math.round(originalMinor * 0.02));
  const feesMinor = Math.max(0, opts?.feesMinor ?? 0);
  const pointsRedeemedMinor = Math.max(0, opts?.pointsRedeemedMinor ?? 0);
  const finalMinor = Math.max(
    0,
    originalMinor - discountMinor + taxesMinor + feesMinor - pointsRedeemedMinor,
  );
  return {
    originalMinor,
    discountMinor,
    savingsMinor,
    taxesMinor,
    feesMinor,
    pointsRedeemedMinor,
    finalMinor,
    currency: opts?.currency || components[0]?.currency || "KWD",
  };
}

export function upsertComponent(
  draft: PackageDraft,
  component: PackageComponent,
): PackageDraft {
  const rest = draft.components.filter((c) => c.kind !== component.kind);
  const components = [...rest, component];
  return {
    ...draft,
    components,
    totalSellAmountMinor: packageTotal(components),
    currency: component.currency || draft.currency,
    savingsMinor: computeBundleDiscount(components),
    status: "draft",
  };
}

export function removeComponent(
  draft: PackageDraft,
  kind: PackageComponent["kind"],
): PackageDraft {
  const components = draft.components.filter((c) => c.kind !== kind);
  return {
    ...draft,
    components,
    totalSellAmountMinor: packageTotal(components),
    savingsMinor: computeBundleDiscount(components),
    status: components.length ? "draft" : "draft",
  };
}

export function emptyTripDraft(id?: string): PackageDraft {
  return {
    id: id || `trip_${Date.now().toString(36)}`,
    components: [],
    totalSellAmountMinor: 0,
    currency: "KWD",
    savingsMinor: 0,
    status: "draft",
  };
}
