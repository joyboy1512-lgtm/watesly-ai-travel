/** Hotelbeds Booking API availability shapes (subset used by WeekendGate). */
export type HbCancellationPolicy = {
    amount?: string | number;
    hotelAmount?: string | number;
    hotelCurrency?: string;
    from?: string;
};
export type HbTax = {
    included?: boolean;
    amount?: string | number;
    clientAmount?: string | number;
    currency?: string;
    clientCurrency?: string;
    type?: string;
    percent?: string | number;
    subType?: string;
};
export type HbTaxes = {
    taxes?: HbTax[];
    allIncluded?: boolean;
};
export type HbPromotion = {
    code?: string;
    name?: string;
    remark?: string;
};
export type HbOffer = {
    code?: string;
    name?: string;
    amount?: string | number;
};
export type HbRate = {
    rateKey?: string;
    rateClass?: string;
    rateType?: "BOOKABLE" | "RECHECK" | string;
    net?: string | number;
    sellingRate?: string | number;
    hotelSellingRate?: string | number;
    hotelCurrency?: string;
    hotelMandatory?: boolean | string | null;
    allotment?: number;
    commission?: string | number;
    commissionVAT?: string | number;
    commissionPCT?: string | number;
    paymentType?: "AT_WEB" | "AT_HOTEL" | string;
    packaging?: boolean;
    boardCode?: string;
    boardName?: string;
    cancellationPolicies?: HbCancellationPolicy[];
    taxes?: HbTaxes;
    rooms?: number;
    adults?: number;
    children?: number;
    childrenAges?: string;
    promotions?: HbPromotion[];
    offers?: HbOffer[];
    rateCommentsId?: string;
    rateComments?: string | string[];
    dailyRates?: Array<{
        offset?: number;
        dailyNet?: string | number;
    }>;
};
export type HbRoom = {
    code?: string;
    name?: string;
    rates?: HbRate[];
};
export type HbHotel = {
    code?: number | string;
    name?: string;
    categoryCode?: string;
    categoryName?: string;
    destinationCode?: string;
    destinationName?: string;
    zoneCode?: number | string;
    zoneName?: string;
    latitude?: number | string;
    longitude?: number | string;
    minRate?: string | number;
    maxRate?: string | number;
    currency?: string;
    rooms?: HbRoom[];
    exclusiveDeal?: number;
    checkIn?: string;
    checkOut?: string;
};
export type HbAvailabilityResponse = {
    auditData?: Record<string, unknown>;
    hotel?: HbHotel;
    hotels?: {
        checkIn?: string;
        checkOut?: string;
        total?: number;
        hotels?: HbHotel[];
    };
    error?: {
        message?: string;
        code?: string;
    };
};
export type HbRateCommentsResponse = {
    auditData?: Record<string, unknown>;
    rateComments?: Array<{
        code?: number | string;
        date?: string;
        incoming?: number | string;
        hotel?: number | string;
        description?: string | {
            content?: string;
        };
        commentsByRate?: Array<{
            rateClass?: string;
            comment?: string;
        }>;
    }>;
    error?: {
        message?: string;
        code?: string;
    };
};
export declare function hotelsFromHotelbedsPayload(json: HbAvailabilityResponse): HbHotel[];
//# sourceMappingURL=hotelbeds-types.d.ts.map