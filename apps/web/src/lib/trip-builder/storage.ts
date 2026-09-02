/** sessionStorage for trip draft — no passport/payment data */
import type { TripDraftState } from "@watesly-travel/shared";

const KEY = "weekendgate_trip_draft_v1";

export function loadTripDraft(): TripDraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripDraftState;
  } catch {
    return null;
  }
}

export function saveTripDraft(draft: TripDraftState): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }));
  } catch {
    /* quota */
  }
}

export function clearTripDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
