/**
 * Realistic mock hotel catalog for MockHotelProvider.
 * Nightly rates are major currency units (KWD); callers convert to minor.
 */
export type MockHotelTemplate = {
    id: string;
    nameAr: string;
    nameEn: string;
    stars: 3 | 4 | 5;
    rating: number;
    reviewCount: number;
    neighborhood: string;
    propertyType: "hotel" | "apartment" | "resort" | "guest_house";
    roomType: string;
    board: string;
    facilities: string[];
    freeCancellation: boolean;
    noPrepayment: boolean;
    /** Nightly rate in KWD major */
    nightRateKwd: number;
    roomsAvailable: number;
    imageUrl: string;
    scenario?: "normal" | "price_change" | "sold_out" | "unavailable";
};
export declare function hotelsForDestination(destCode: string, label: string): MockHotelTemplate[];
//# sourceMappingURL=mock-hotel-catalog.d.ts.map