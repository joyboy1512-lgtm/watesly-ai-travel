import type { FlightOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightRevalidateResult, FlightSearchParams, ProviderBookingResult } from "../types";
export type TravelfusionCreds = {
    username: string;
    password: string;
    loginId?: string;
};
/**
 * Travelfusion adapter scaffold — covers many LCCs and domestic airlines.
 * XML API endpoints will be wired once login credentials are provided.
 */
export declare class TravelfusionFlightProvider implements FlightProviderAdapter {
    readonly providerKey = "travelfusion";
    readonly displayName = "Travelfusion";
    readonly liveMode: boolean;
    private readonly creds;
    constructor(creds?: Partial<TravelfusionCreds>);
    private ensureConfigured;
    searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]>;
    revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult>;
    createBooking(_offer: FlightOffer, _passengers: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=travelfusion-flight-provider.d.ts.map