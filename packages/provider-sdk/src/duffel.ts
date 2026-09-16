import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import { DuffelFlightProvider } from "./flights/duffel-flight-provider";
import type {
  FlightSearchParams,
  HotelSearchParams,
  ProviderBookingResult,
  RevalidateResult,
} from "./types";

/**
 * Combined Duffel travel facade.
 * Flights delegate to DuffelFlightProvider; hotels remain scaffold until wired.
 */
export class DuffelTravelProvider {
  readonly providerKey = "duffel";
  readonly displayName = "Duffel";
  readonly liveMode: boolean;
  private readonly flights: DuffelFlightProvider;

  constructor(token?: string) {
    this.flights = new DuffelFlightProvider(token);
    this.liveMode = this.flights.liveMode;
  }

  searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    return this.flights.searchFlights(params);
  }

  async searchHotels(_params: HotelSearchParams): Promise<HotelOffer[]> {
    return [];
  }

  revalidateOffer(
    offer: HotelOffer | FlightOffer,
  ): Promise<RevalidateResult> {
    // Flight offers carry Duffel offer ids (off_…)
    if (
      offer.providerKey === "duffel" &&
      String(offer.providerOfferRef || "").startsWith("off_")
    ) {
      return this.flights.revalidateOffer(offer as FlightOffer);
    }
    return Promise.resolve({
      available: true,
      priceChanged: false,
      offer,
    });
  }

  async createBooking(): Promise<ProviderBookingResult> {
    return { providerBookingRef: "", status: "failed" };
  }
}
