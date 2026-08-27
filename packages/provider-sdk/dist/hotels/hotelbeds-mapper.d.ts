import type { HotelOffer } from "@watesly-travel/shared";
import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";
import type { HotelSearchParams } from "../types";
import type { HbContentHotel } from "./hotelbeds-content-types";
import type { GeoCenter } from "./hotelbeds-geo";
import type { HbHotel } from "./hotelbeds-types";
export declare function extractHotelbedsRateOptions(hotel: HbHotel, providerCurrency: string, displayCurrency: string, checkIn?: string): {
    rooms: HotelRoomOption[];
    rateOptions: HotelRateOption[];
};
export declare function mapHotelbedsToOffer(input: {
    hotel: HbHotel;
    params: HotelSearchParams;
    geoLabel?: string;
    liveMode: boolean;
    expiresAt: string;
    content?: HbContentHotel;
    searchCenter?: GeoCenter;
    facilityCatalog?: Map<string, string>;
}): HotelOffer | null;
export declare function mapCheckratesToOffer(offer: HotelOffer, hotel: HbHotel, selectedRateKey?: string): HotelOffer;
export declare function findMappedRate(offer: HotelOffer, rateKey?: string): HotelRateOption | undefined;
//# sourceMappingURL=hotelbeds-mapper.d.ts.map