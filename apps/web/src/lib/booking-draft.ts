export type BookingDraftFlight = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type BookingDraftHotelRate = {
  rateKey: string;
  rateType: string;
  roomCode: string;
  roomName: string;
  boardCode: string;
  boardName: string;
  net: number;
  currency: string;
  paymentType?: string;
  freeCancellation: boolean;
  allotment?: number;
  rateComments?: string;
};

export type BookingDraftHotel = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type FlightBookingDraft = {
  serviceType: "flight";
  flight: BookingDraftFlight;
  origin: string;
  destination: string;
  originLabel: string;
  destinationLabel: string;
  departDate: string;
  returnDate?: string;
  tripType: "roundtrip" | "oneway";
  adults: number;
  children: number;
  cabinClass: string;
  createdAt: string;
  /** Present when the offer originated from a live search + created Quote. */
  inquiryId?: string;
  quoteId?: string;
  quoteItemId?: string;
};

export type HotelBookingDraft = {
  serviceType: "hotel";
  hotel: BookingDraftHotel;
  selectedRate?: BookingDraftHotelRate;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  location: string;
  locationLabel: string;
  createdAt: string;
  inquiryId?: string;
  quoteId?: string;
  quoteItemId?: string;
};

export type BookingDraft = FlightBookingDraft | HotelBookingDraft;

/** @deprecated kept only for backward-compatible imports; use FlightBookingDraft */
export type LegacyFlightBookingDraft = Omit<FlightBookingDraft, "serviceType">;

const KEY = "watesly_travel_booking_draft";

function write(payload: BookingDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(payload));
}

/** Unified save — prefer this or one of the typed helpers below. */
export function saveBookingDraft(draft: BookingDraft) {
  write(draft);
}

export function saveFlightDraft(draft: Omit<FlightBookingDraft, "serviceType">) {
  write({ ...draft, serviceType: "flight" });
}

export function saveHotelDraft(draft: Omit<HotelBookingDraft, "serviceType">) {
  write({ ...draft, serviceType: "hotel" });
}

export function getBookingDraft(): BookingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as
      | (Partial<BookingDraft> & Record<string, unknown>)
      | null;
    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.serviceType === "hotel" && "hotel" in parsed) {
      return parsed as HotelBookingDraft;
    }
    // Legacy drafts saved before `serviceType` existed were always flights.
    if (parsed.serviceType === "flight" || "flight" in parsed) {
      return { ...(parsed as FlightBookingDraft), serviceType: "flight" };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
