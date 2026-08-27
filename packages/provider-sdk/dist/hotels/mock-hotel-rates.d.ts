import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";
import type { MockHotelTemplate } from "./mock-hotel-catalog";
export declare function buildMockHotelRateTree(input: {
    hotel: MockHotelTemplate;
    providerOfferRef: string;
    nightMajor: number;
    currency: string;
    nights: number;
    seed: number;
}): {
    rooms: HotelRoomOption[];
    rateOptions: HotelRateOption[];
};
//# sourceMappingURL=mock-hotel-rates.d.ts.map