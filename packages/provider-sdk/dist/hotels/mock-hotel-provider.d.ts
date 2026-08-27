import type { HotelOffer } from "@watesly-travel/shared";
import type { HotelProviderAdapter, HotelRevalidateResult, HotelSearchParams, ProviderBookingResult } from "../types";
export declare class MockHotelProvider implements HotelProviderAdapter {
    readonly providerKey = "mock";
    readonly displayName = "\u0645\u0632\u0648\u062F \u062A\u062C\u0631\u064A\u0628\u064A (Mock)";
    readonly liveMode = false;
    searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
    revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult>;
    createBooking(offer: HotelOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=mock-hotel-provider.d.ts.map