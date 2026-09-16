import type { HotelSearchFilters } from "./hotel-search";

const KEY = "watesly_hotel_results_session";

export type HotelSortKey = "price_asc" | "price_desc" | "rating_desc" | "best" | "distance";

export type HotelResultsSession = {
  filters: HotelSearchFilters;
  sortKey: HotelSortKey;
  scrollY: number;
  openHotelId: string | null;
  returnHref: string;
  visibleCount?: number;
  savedAt: string;
};

export function saveHotelResultsSession(session: Omit<HotelResultsSession, "savedAt">) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    KEY,
    JSON.stringify({ ...session, savedAt: new Date().toISOString() }),
  );
}

export function loadHotelResultsSession(): HotelResultsSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HotelResultsSession;
  } catch {
    return null;
  }
}

export function clearHotelResultsSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function shouldRestoreHotelResultsSession(returnHref: string): boolean {
  const saved = loadHotelResultsSession();
  if (!saved) return false;
  return saved.returnHref === returnHref;
}
