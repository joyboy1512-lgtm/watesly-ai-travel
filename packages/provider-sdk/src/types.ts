import type {
  ActivityOffer,
  FlightOffer,
  HotelOffer,
  HotelRateOption,
  MoneyMinor,
  TransferOffer,
} from "@watesly-travel/shared";

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departDate: string;
  returnDate?: string | null;
  adults: number;
  children?: number;
  infants?: number;
  cabinClass?: string | null;
  currency?: string;
}

export interface HotelSearchParams {
  location: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children?: number;
  childrenAges?: string;
  rooms?: number;
  /** Numeric Hotelbeds code or `hb-12345` ref for single-hotel detail fetch */
  hotelCode?: string;
  currency?: string;
  radiusKm?: number;
  maxHotels?: number;
  maxRoomsPerHotel?: number;
  minStars?: number;
  maxStars?: number;
  minRate?: number;
  maxRate?: number;
  boardCode?: string;
  paymentType?: string;
  shiftDays?: number;
}

export interface TransferSearchParams {
  city?: string;
  from: string;
  to: string;
  fromKind?: "IATA" | "ATLAS" | "GPS";
  toKind?: "IATA" | "ATLAS" | "GPS";
  outboundDate: string;
  outboundTime?: string;
  inboundDate?: string;
  inboundTime?: string;
  adults: number;
  children?: number;
  infants?: number;
  currency?: string;
  /** Human label for ATLAS/GPS fallback when hotel code has no transfer offers. */
  toLabel?: string;
}

export interface ActivitySearchParams {
  destination: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children?: number;
  currency?: string;
  language?: string;
}

export interface ProviderBookingResult {
  providerBookingRef: string;
  status: string;
}

export interface FlightRevalidateResult {
  available: boolean;
  offer: FlightOffer;
  priceChanged: boolean;
  previousCostMinor?: MoneyMinor;
}

export interface HotelRevalidateResult {
  available: boolean;
  offer: HotelOffer;
  priceChanged: boolean;
  previousCostMinor?: MoneyMinor;
  selectedRate?: HotelRateOption;
  rateComments?: string;
}

/** @deprecated Prefer FlightRevalidateResult | HotelRevalidateResult */
export type RevalidateResult = {
  available: boolean;
  offer: FlightOffer | HotelOffer;
  priceChanged: boolean;
  previousCostMinor?: MoneyMinor;
};

/** Flight-only provider contract (mock, duffel, amadeus, …). */
export interface FlightProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
  revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
  createBooking?(
    offer: FlightOffer,
    passengers: unknown,
  ): Promise<ProviderBookingResult>;
}

/** Hotel-only provider contract (mock, duffel, real, …). */
export interface HotelProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;
  searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
  revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult>;
  fetchRateComments?(
    ids: string[],
    date: string,
  ): Promise<Record<string, string>>;
  createBooking?(
    offer: HotelOffer,
    guests: unknown,
  ): Promise<ProviderBookingResult>;
}

/** Transfer-only provider contract (Hotelbeds Transfers, mock, …). */
export interface TransferProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;
  searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]>;
  createBooking?(
    offer: TransferOffer,
    guests: unknown,
  ): Promise<ProviderBookingResult>;
}

/** Activity-only provider contract (Hotelbeds Activities, mock, …). */
export interface ActivityProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;
  searchActivities(params: ActivitySearchParams): Promise<ActivityOffer[]>;
  /** Optional connectivity check — Activities suite often lacks /status. */
  pingStatus?(): Promise<{ ok: boolean; message: string; path?: string }>;
  createBooking?(
    offer: ActivityOffer,
    guests: unknown,
  ): Promise<ProviderBookingResult>;
}

/**
 * Legacy combined adapter — kept for backward compatibility.
 * New code should use FlightProviderAdapter / HotelProviderAdapter.
 */
export interface TravelProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;
  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
  searchHotels?(params: HotelSearchParams): Promise<HotelOffer[]>;
  revalidateOffer(offer: FlightOffer | HotelOffer): Promise<RevalidateResult>;
  createBooking?(
    offer: FlightOffer | HotelOffer,
    passengers: unknown,
  ): Promise<ProviderBookingResult>;
}

export function amountToMinor(amount: string | number, currency = "KWD"): MoneyMinor {
  const n = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(n)) return 0;
  const code = (currency || "KWD").toUpperCase();
  const exp =
    code === "KWD" ||
    code === "BHD" ||
    code === "OMR" ||
    code === "JOD" ||
    code === "TND"
      ? 3
      : 2;
  return Math.round(n * 10 ** exp);
}
