import type { FlightSearchFilters, FlightSortKey } from "./flight-search";

const KEY = "watesly_flight_results_session";

export type FlightResultsSession = {
  filters: FlightSearchFilters;
  sortKey: FlightSortKey;
  scrollY: number;
  expandedTripId: string | null;
  selectedOutboundKey: string | null;
  selectedReturnKey: string | null;
  returnHref: string;
  savedAt: string;
};

export function saveFlightResultsSession(session: Omit<FlightResultsSession, "savedAt">) {
  if (typeof window === "undefined") return;
  const payload: FlightResultsSession = { ...session, savedAt: new Date().toISOString() };
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadFlightResultsSession(): FlightResultsSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FlightResultsSession;
  } catch {
    return null;
  }
}

export function clearFlightResultsSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function shouldRestoreResultsSession(returnHref: string): boolean {
  const saved = loadFlightResultsSession();
  if (!saved) return false;
  return saved.returnHref === returnHref;
}
