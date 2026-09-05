import type { FlightOffer } from "@watesly-travel/shared";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";

/** Stub — Duffel flight provider not present in this workspace snapshot. */
export class DuffelFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "duffel";
  readonly displayName = "Duffel Flights";
  readonly liveMode: boolean;

  constructor(_token?: string) {
    this.liveMode = Boolean(_token || process.env.DUFFEL_ACCESS_TOKEN);
  }

  async searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]> {
    return [];
  }

  async revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult> {
    return { available: true, priceChanged: false, offer };
  }

  async createBooking(
    _offer: FlightOffer,
    _passengers: unknown,
  ): Promise<ProviderBookingResult> {
    return { providerBookingRef: "", status: "failed" };
  }
}
