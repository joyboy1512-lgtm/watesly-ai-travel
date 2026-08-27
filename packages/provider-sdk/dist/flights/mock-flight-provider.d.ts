import type { FlightOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightRevalidateResult, FlightSearchParams, ProviderBookingResult } from "../types";
export declare class MockFlightProvider implements FlightProviderAdapter {
    readonly providerKey = "mock";
    readonly displayName = "\u0645\u0632\u0648\u062F \u062A\u062C\u0631\u064A\u0628\u064A (Mock)";
    readonly liveMode = false;
    searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
    revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
    createBooking(offer: FlightOffer, _passengers?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=mock-flight-provider.d.ts.map