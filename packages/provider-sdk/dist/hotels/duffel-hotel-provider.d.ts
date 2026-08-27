import type { HotelOffer } from "@watesly-travel/shared";
import type { HotelProviderAdapter, HotelRevalidateResult, HotelSearchParams, ProviderBookingResult } from "../types";
/** Real hotel provider backed by Duffel Stays API. */
export declare class DuffelHotelProvider implements HotelProviderAdapter {
    readonly providerKey = "duffel";
    readonly displayName = "Duffel Hotels";
    readonly liveMode: boolean;
    private readonly inner;
    constructor(token?: string);
    searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
    revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult>;
    createBooking(_offer: HotelOffer, _guests: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=duffel-hotel-provider.d.ts.map