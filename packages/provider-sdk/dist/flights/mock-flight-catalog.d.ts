/**
 * Realistic mock flight catalog for MockFlightProvider.
 * All amounts are major currency units (KWD unless noted); callers convert to minor.
 */
export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type MockAirline = {
    code: string;
    name: string;
    nameAr: string;
};
export type MockSegmentTemplate = {
    from: string;
    to: string;
    departOffsetMin: number;
    durationMin: number;
    flightNumberPrefix: string;
};
export type MockFlightTemplate = {
    id: string;
    airlineCode: string;
    cabin: CabinClass;
    stops: number;
    segments: MockSegmentTemplate[];
    /** Base one-way adult fare in KWD major units (before route multiplier). */
    baseFareKwd: number;
    taxesKwd: number;
    baggage: {
        personal: string;
        cabin: string;
        checked: string;
    };
    policies: {
        changeable: boolean;
        refundable: boolean;
        changeFeeKwd: number | null;
        cancelFeeKwd: number | null;
        noteAr: string;
    };
    scenario?: "normal" | "price_change" | "sold_out" | "provider_fail";
    flexible?: boolean;
};
export declare const MOCK_AIRLINES: Record<string, MockAirline>;
/** Destinations commonly searched from Kuwait */
export declare const MOCK_ROUTE_MULTIPLIER: Record<string, number>;
export declare const MOCK_DESTINATION_LABELS: Record<string, string>;
/** Core flight templates — adapted per origin/destination at search time */
export declare const MOCK_FLIGHT_TEMPLATES: MockFlightTemplate[];
export declare function minutesToDuration(totalMin: number): string;
export declare function addMinutesToIsoDate(date: string, minutes: number): {
    isoLocal: string;
    clock: string;
};
//# sourceMappingURL=mock-flight-catalog.d.ts.map