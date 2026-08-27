/**
 * Package (flight+hotel) composition — scaffold until commercial rules settle.
 * Never confirm a package until every component is confirmed.
 */

export type PackageComponentKind = "flight" | "hotel" | "transfer" | "activity";

export type PackageComponentStatus =
  | "selected"
  | "repriced"
  | "pending"
  | "confirmed"
  | "failed";

export type PackageComponent = {
  kind: PackageComponentKind;
  offerId: string;
  status: PackageComponentStatus;
  sellAmountMinor: number;
  currency: string;
  label: string;
};

export type PackageDraft = {
  id: string;
  components: PackageComponent[];
  totalSellAmountMinor: number;
  currency: string;
  savingsMinor?: number;
  status: "draft" | "repricing" | "ready" | "booking" | "partial_failure" | "confirmed";
};

export function packageTotal(components: PackageComponent[]): number {
  return components.reduce((s, c) => s + Math.max(0, c.sellAmountMinor), 0);
}

export function canConfirmPackage(draft: PackageDraft): boolean {
  if (!draft.components.length) return false;
  return draft.components.every((c) => c.status === "confirmed" || c.status === "repriced");
}

export function repricePackageRequired(draft: PackageDraft): boolean {
  return draft.components.some((c) => c.status === "selected" || c.status === "failed");
}
