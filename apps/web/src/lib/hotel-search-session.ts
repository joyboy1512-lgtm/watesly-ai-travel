import type { HotelSearchFilters } from "@/lib/hotel-search";

export type StoredHotelOffer = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type HotelSearchSession = {
  hotels: StoredHotelOffer[];
  filters: HotelSearchFilters;
  sortKey: "price_asc" | "price_desc" | "rating_desc" | "best";
  meta: {
    stayQuery: string;
    departDate: string;
    returnDate: string;
    rooms: number;
    adults: number;
    children: number;
    infants?: number;
    destination: string;
    nights: number;
  };
  inquiryId?: string;
  quote?: {
    id: string;
    items?: Array<{ id: string; providerOfferRef: string; serviceType: string }>;
  };
  providerName?: string;
  liveMode?: boolean;
  savedAt: string;
};

const KEY = "watesly_hotel_search_session";

export function saveHotelSearchSession(session: Omit<HotelSearchSession, "savedAt">) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    KEY,
    JSON.stringify({ ...session, savedAt: new Date().toISOString() }),
  );
}

export function getHotelSearchSession(): HotelSearchSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HotelSearchSession;
  } catch {
    return null;
  }
}

export function resolveQuoteItemId(
  session: HotelSearchSession,
  offerId: string,
): string | undefined {
  return session.quote?.items?.find(
    (item) => item.providerOfferRef === offerId && item.serviceType === "hotel",
  )?.id;
}
