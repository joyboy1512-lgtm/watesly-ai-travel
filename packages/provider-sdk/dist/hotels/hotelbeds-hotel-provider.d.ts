import type { HotelOffer } from "@watesly-travel/shared";
import type { HotelProviderAdapter, HotelRevalidateResult, HotelSearchParams, ProviderBookingResult } from "../types";
import { type HotelbedsCredentials } from "./hotelbeds-auth";
export declare class HotelbedsHotelProvider implements HotelProviderAdapter {
    readonly providerKey = "hotelbeds";
    readonly displayName = "Hotelbeds Hotels";
    readonly liveMode: boolean;
    private readonly creds;
    constructor(creds?: Partial<HotelbedsCredentials>);
    private ensureConfigured;
    private request;
    pingStatus(): Promise<{
        ok: boolean;
        message: string;
    }>;
    searchHotels(params: HotelSearchParams): Promise<HotelOffer[]>;
    private searchHotelsInner;
    fetchRateComments(ids: string[], date: string): Promise<Record<string, string>>;
    revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult>;
    createBooking(_offer: HotelOffer, _guests?: unknown): Promise<ProviderBookingResult>;
}
//# sourceMappingURL=hotelbeds-hotel-provider.d.ts.map