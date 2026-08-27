import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import type { FlightSearchParams, HotelSearchParams, ProviderBookingResult, RevalidateResult } from "./types";
/** Stub — Duffel module not present in this workspace snapshot. */
export declare class DuffelTravelProvider {
    readonly providerKey = "duffel";
    readonly displayName = "Duffel";
    readonly liveMode: boolean;
    constructor(token?: string);
    searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]>;
    searchHotels(_params: HotelSearchParams): Promise<HotelOffer[]>;
    revalidateOffer(offer: HotelOffer | FlightOffer): Promise<RevalidateResult>;
    createBooking(): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=duffel.d.ts.map