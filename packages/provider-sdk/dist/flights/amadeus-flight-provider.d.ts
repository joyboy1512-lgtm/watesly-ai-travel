import type { FlightOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightRevalidateResult, FlightSearchParams, ProviderBookingResult } from "../types";
type AmadeusCreds = {
    clientId: string;
    clientSecret: string;
    hostname?: string;
};
/**
 * Amadeus Self-Service Flight Offers Search.
 * Activates when AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET (or constructor creds) are set.
 */
export declare class AmadeusFlightProvider implements FlightProviderAdapter {
    readonly providerKey = "amadeus";
    readonly displayName = "Amadeus";
    readonly liveMode: boolean;
    private readonly clientId;
    private readonly clientSecret;
    private readonly hostname;
    private tokenCache;
    constructor(creds?: Partial<AmadeusCreds>);
    private ensureConfigured;
    private getAccessToken;
    private cabinToAmadeus;
    searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
    revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
    createBooking(_offer: FlightOffer, _passengers: unknown): Promise<ProviderBookingResult>;
}
export {};
//# sourceMappingURL=amadeus-flight-provider.d.ts.map