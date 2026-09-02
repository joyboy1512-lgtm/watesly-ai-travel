import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import type {
  FlightSearchParams,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
  RevalidateResult,
} from "./types";

/** Stub — Duffel module not present in this workspace snapshot. */
export class DuffelTravelProvider {
  readonly providerKey = "duffel";
  readonly displayName = "Duffel";
  readonly liveMode: boolean;

  constructor(token?: string) {
    this.liveMode = Boolean(token || process.env.DUFFEL_ACCESS_TOKEN);
  }

  async searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]> {
    return [];
  }

  async searchHotels(_params: HotelSearchParams): Promise<HotelOffer[]> {
    return [];
  }

  async revalidateOffer(
    offer: HotelOffer | FlightOffer,
  ): Promise<RevalidateResult> {
    return {
      available: true,
      priceChanged: false,
      offer,
    };
  }

  async createBooking(): Promise<ProviderBookingResult> {
    return { providerBookingRef: "", status: "failed" };
  }
}
