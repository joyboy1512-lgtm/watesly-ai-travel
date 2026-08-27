import type { FlightOffer, HotelOffer } from "@watesly-travel/shared";
import type { FlightProviderAdapter, FlightSearchParams, HotelProviderAdapter, HotelSearchParams, ProviderBookingResult, RevalidateResult, TravelProviderAdapter } from "./types";
/** Combines independent flight + hotel providers into the legacy TravelProviderAdapter. */
export declare class CompositeTravelProvider implements TravelProviderAdapter {
    private readonly flights;
    private readonly hotels;
    readonly providerKey: string;
    readonly displayName: string;
    readonly liveMode: boolean;
    constructor(flights: FlightProviderAdapter, hotels: HotelProviderAdapter);
    get flightProvider(): FlightProviderAdapter;
    get hotelProvider(): HotelProviderAdapter;
    searchFlights(params: FlightSearchParams): Promise<FlightOffer[]>;
    searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
    revalidateOffer(offer: FlightOffer | HotelOffer): Promise<RevalidateResult>;
    createBooking(offer: FlightOffer | HotelOffer, passengers: unknown): Promise<ProviderBookingResult>;
}
export declare function isHotelOffer(offer: FlightOffer | HotelOffer): offer is HotelOffer;
//# sourceMappingURL=composite.d.ts.map