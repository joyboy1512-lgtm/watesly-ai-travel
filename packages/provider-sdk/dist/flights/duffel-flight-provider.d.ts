import type { FlightOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightRevalidateResult, FlightSearchParams, ProviderBookingResult } from "../types";
/** Stub — Duffel flight provider not present in this workspace snapshot. */
export declare class DuffelFlightProvider implements FlightProviderAdapter {
    readonly providerKey = "duffel";
    readonly displayName = "Duffel Flights";
    readonly liveMode: boolean;
    constructor(_token?: string);
    searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]>;
    revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
    createBooking(_offer: FlightOffer, _passengers: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=duffel-flight-provider.d.ts.map