import type { ComposedTrip } from "./flight-compose";
import type { FlightPriceBreakdown, MockFareOption, MockProviderOffer } from "./flight-fare-mock";
import type { SelectedLeg } from "./flight-leg-selection";

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
  cancellationFrom?: string;
  taxes?: {
    allIncluded?: boolean;
    items: Array<{
      type?: string;
      amount: number;
      currency: string;
      included: boolean;
    }>;
  };
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
  tripType: "roundtrip" | "oneway" | "multicity";
  adults: number;
  children: number;
  infants?: number;
  cabinClass: string;
  createdAt: string;
  inquiryId?: string;
  quoteId?: string;
  quoteItemId?: string;
  composedTrip?: ComposedTrip;
  selectedOutbound?: SelectedLeg;
  selectedReturn?: SelectedLeg | null;
  selectedFare?: MockFareOption;
  selectedProvider?: MockProviderOffer;
  priceBreakdown?: FlightPriceBreakdown;
  validatedAt?: string;
  resultsReturnHref?: string;
};

export type HotelDraftPriceBreakdown = {
  stayMinor: number;
  includedTaxMinor: number;
  excludedTaxMinor: number;
  serviceFeeMinor: number;
  payNowMinor: number;
  payAtHotelMinor: number;
  tripTotalMinor: number;
  perNightMinor: number;
  taxesIncluded: boolean;
};

export type HotelRoomGuestDraft = {
  roomIndex: number;
  isLead: boolean;
  title: string;
  firstName: string;
  lastName: string;
  /** Latin / passport spelling */
  firstNameEn?: string;
  lastNameEn?: string;
  type: "adult" | "child";
  age?: number;
  birthDate?: string;
  gender?: string;
  nationality?: string;
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
  infants?: number;
  childAges?: number[];
  roomOccupancies?: Array<{ adults: number; childAges: number[] }>;
  location: string;
  locationLabel: string;
  createdAt: string;
  inquiryId?: string;
  quoteId?: string;
  quoteItemId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  specialRequests?: string;
  paymentMethod?: string;
  travelers?: Array<{ firstName: string; lastName: string }>;
  roomGuests?: HotelRoomGuestDraft[];
  nights?: number;
  totalMinor?: number;
  priceBreakdown?: HotelDraftPriceBreakdown;
  validatedAt?: string;
  priceChanged?: boolean;
  previousTotalMinor?: number;
  resultsReturnHref?: string;
};

export type BookingDraftTransfer = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type TransferBookingDraft = {
  serviceType: "transfer";
  transfer: BookingDraftTransfer;
  city?: string;
  pickupKind?: "airport" | "hotel" | "address";
  dropoffKind?: "airport" | "hotel" | "address";
  from: string;
  to: string;
  outboundDate: string;
  outboundTime?: string;
  inboundDate?: string;
  inboundTime?: string;
  adults: number;
  children: number;
  infants?: number;
  createdAt: string;
  inquiryId?: string;
  quoteId?: string;
  quoteItemId?: string;
};

export type BookingDraftActivity = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type ActivityBookingDraft = {
  serviceType: "activity";
  activity: BookingDraftActivity;
  destination: string;
  destinationLabel: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children: number;
  createdAt: string;
  inquiryId?: string;
};

export type BookingDraft =
  | FlightBookingDraft
  | HotelBookingDraft
  | TransferBookingDraft
  | ActivityBookingDraft;

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

export function saveTransferDraft(
  draft: Omit<TransferBookingDraft, "serviceType">,
) {
  write({ ...draft, serviceType: "transfer" });
}

export function saveActivityDraft(
  draft: Omit<ActivityBookingDraft, "serviceType">,
) {
  write({ ...draft, serviceType: "activity" });
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
    if (parsed.serviceType === "transfer" && "transfer" in parsed) {
      return parsed as TransferBookingDraft;
    }
    if (parsed.serviceType === "activity" && "activity" in parsed) {
      return parsed as ActivityBookingDraft;
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
