import type { PackageComponentKind } from "../package-compose";

export type TripServiceKind = PackageComponentKind;

export type TripTier = "budget" | "balanced" | "comfort";

export type TripSearchStatus = "idle" | "searching" | "partial" | "done" | "error";

export type RepriceStatus =
  | "idle"
  | "checking"
  | "verified"
  | "price_changed"
  | "unavailable"
  | "expired"
  | "timeout"
  | "partial_failure"
  | "alternative_available";

export type ServiceBookingStatus =
  | "pending"
  | "confirming"
  | "confirmed"
  | "ticketed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "manual_review";

export type FlightTripType = "roundtrip" | "oneway" | "multicity";

export type TripFlightLeg = {
  id: string;
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departDate: string;
};

export type TripFlightDraft = {
  tripType: FlightTripType;
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  /** Ages 0–17 for each child — used for hotels */
  childAges: number[];
  cabinClass: string;
  directOnly: boolean;
  flexibleDates: boolean;
  legs: TripFlightLeg[];
};

export type TripHotelDraft = {
  destination: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  childAges: number[];
  starRating: number;
  boardType: string;
  /** Links this hotel stay to a multicity destination/leg */
  legId?: string;
};

export type TripTransferDraft = {
  pickup: string;
  dropoff: string;
  pickupDate: string;
  pickupTime: string;
  roundtrip: boolean;
  passengers: number;
  bags: number;
  vehicleType: string;
  legId?: string;
};

export type TripActivityDraft = {
  city: string;
  startDate: string;
  endDate: string;
  participants: number;
  interests: string;
  activityTypes: string;
  budgetMinor: number;
  suggestWithAi: boolean;
  legId?: string;
};

/** Per-destination service flags for multicity packages */
export type TripDestinationServiceFlags = {
  legId: string;
  destination: string;
  destinationLabel: string;
  hotel: boolean;
  transfer: boolean;
  activity: boolean;
};

export type TripTravelerDraft = {
  title: string;
  firstNameEn: string;
  lastNameEn: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};

export type TripContactDraft = {
  phoneCountry: string;
  phone: string;
  email: string;
  emailConfirm: string;
  whatsappUpdates: boolean;
};

export type ServiceSearchSlice = {
  kind: TripServiceKind;
  status: "ok" | "error" | "empty" | "timeout";
  errorMessage?: string;
  offers: TripOfferSummary[];
};

export type TripOfferSummary = {
  id: string;
  label: string;
  sellAmountMinor: number;
  currency: string;
  meta?: Record<string, string | number | boolean>;
};

export type TripPackageOption = {
  tier: TripTier;
  titleAr: string;
  flight?: TripOfferSummary;
  hotel?: TripOfferSummary;
  transfer?: TripOfferSummary;
  activities: TripOfferSummary[];
  totalMinor: number;
  currency: string;
};

export type TripSearchResult = {
  sessionId: string;
  status: TripSearchStatus;
  slices: ServiceSearchSlice[];
  options: TripPackageOption[];
  searchedAt: string;
};

export type TripDraftState = {
  tripId: string;
  sessionId: string;
  services: TripServiceKind[];
  flight: TripFlightDraft;
  hotel: TripHotelDraft;
  transfer: TripTransferDraft;
  activity: TripActivityDraft;
  /** Extra hotels when multicity + per-destination hotels enabled */
  hotels: TripHotelDraft[];
  /** Extra transfers when multicity */
  transfers: TripTransferDraft[];
  /** Extra activities when multicity */
  activities: TripActivityDraft[];
  destinationFlags: TripDestinationServiceFlags[];
  selectedTier: TripTier | null;
  selectedOffers: Partial<Record<TripServiceKind, TripOfferSummary>>;
  travelers: TripTravelerDraft[];
  contact: TripContactDraft;
  search: TripSearchResult | null;
  repriceStatus: RepriceStatus;
  repriceMessage?: string;
  priceLockExpiresAt?: string;
  updatedAt: string;
};

export type TripTimelineItem = {
  id: string;
  day: string;
  time: string;
  title: string;
  description?: string;
  kind: "reminder" | "flight" | "transfer" | "hotel" | "activity" | "free";
  actionLabel?: string;
  actionHref?: string;
};
