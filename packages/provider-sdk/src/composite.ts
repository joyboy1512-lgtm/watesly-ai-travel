import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import type {
  FlightProviderAdapter,
  FlightSearchParams,
  HotelProviderAdapter,
  HotelSearchParams,
  ProviderBookingResult,
  RevalidateResult,
  TravelProviderAdapter,
} from "./types";

/** Combines independent flight + hotel providers into the legacy TravelProviderAdapter. */
export class CompositeTravelProvider implements TravelProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode: boolean;

  constructor(
    private readonly flights: FlightProviderAdapter,
    private readonly hotels: HotelProviderAdapter,
  ) {
    const same = flights.providerKey === hotels.providerKey;
    this.providerKey = same
      ? flights.providerKey
      : `${flights.providerKey}+${hotels.providerKey}`;
    this.displayName = same
      ? flights.displayName
      : `طيران: ${flights.displayName} · فنادق: ${hotels.displayName}`;
    this.liveMode = flights.liveMode || hotels.liveMode;
  }

  get flightProvider() {
    return this.flights;
  }

  get hotelProvider() {
    return this.hotels;
  }

  searchFlights(params: FlightSearchParams) {
    return this.flights.searchFlights(params);
  }

  searchHotels(params: HotelSearchParams) {
    return this.hotels.searchHotels(params);
  }

  async revalidateOffer(
    offer: FlightOffer | HotelOffer,
  ): Promise<RevalidateResult> {
    if (isHotelOffer(offer)) {
      return this.hotels.revalidateOffer(offer);
    }
    return this.flights.revalidateOffer(offer);
  }

  async createBooking(
    offer: FlightOffer | HotelOffer,
    passengers: unknown,
  ): Promise<ProviderBookingResult> {
    if (isHotelOffer(offer)) {
      if (!this.hotels.createBooking) {
        throw new Error(`مزود الفنادق ${this.hotels.providerKey} لا يدعم الحجز`);
      }
      return this.hotels.createBooking(offer, passengers);
    }
    if (!this.flights.createBooking) {
      throw new Error(`مزود الطيران ${this.flights.providerKey} لا يدعم الحجز`);
    }
    return this.flights.createBooking(offer, passengers);
  }
}

export function isHotelOffer(
  offer: FlightOffer | HotelOffer,
): offer is HotelOffer {
  const ref = offer.providerOfferRef || "";
  if (ref.includes("HTL") || ref.startsWith("acc_") || ref.includes("stay")) {
    return true;
  }
  if (ref.startsWith("off_") || ref.includes("FLT")) {
    return false;
  }
  const raw = offer.raw || {};
  if (raw.airline || raw.airlineCode || raw.segments) return false;
  if (raw.name || raw.stars || raw.roomType || raw.checkInDate) return true;
  return false;
}
