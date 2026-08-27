import type { FlightOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightRevalidateResult, FlightSearchParams, ProviderBookingResult } from "../types";
export type TravelportCreds = {
    username: string;
    password: string;
    targetBranch: string;
    endpoint?: string;
};
/**
 * Travelport GDS adapter scaffold.
 * Wire Universal API / JSON APIs here once enterprise credentials are available.
 */
export declare class TravelportFlightProvider implements FlightProviderAdapter {
    readonly providerKey = "travelport";
    readonly displayName = "Travelport";
    readonly liveMode: boolean;
    private readonly creds;
    constructor(creds?: Partial<TravelportCreds>);
    private ensureConfigured;
    searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]>;
    revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
    createBooking(_offer: FlightOffer, _passengers: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=travelport-flight-provider.d.ts.map