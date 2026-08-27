import type { ActivityProviderAdapter, FlightProviderAdapter, HotelProviderAdapter, TransferProviderAdapter, TravelProviderAdapter } from "./types";
export declare function isHotelbedsTransferKey(raw?: string): boolean;
/**
 * Resolve flight provider key.
 * Priority: explicit preferred → FLIGHT_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
export declare function resolveFlightProviderKey(preferred?: string): string;
/**
 * Resolve hotel provider key.
 * Priority: explicit preferred → HOTEL_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
export declare function resolveHotelProviderKey(preferred?: string): string;
export declare function resolveTransferProviderKey(preferred?: string): string;
export declare function resolveActivityProviderKey(preferred?: string): string;
/** @deprecated Use resolveFlightProviderKey / resolveHotelProviderKey */
export declare function resolveProviderKey(preferred?: string): string;
type HotelProviderCreds = {
    apiKey?: string;
    apiSecret?: string;
    baseUrl?: string;
    accessToken?: string;
};
export type FlightProviderCreds = {
    accessToken?: string;
    clientId?: string;
    clientSecret?: string;
    hostname?: string;
    username?: string;
    password?: string;
    targetBranch?: string;
    endpoint?: string;
    loginId?: string;
};
export declare function getFlightProvider(preferred?: string, creds?: FlightProviderCreds): FlightProviderAdapter;
export declare function getHotelProvider(preferred?: string, creds?: HotelProviderCreds): HotelProviderAdapter;
export declare function getTransferProvider(preferred?: string, creds?: HotelProviderCreds): TransferProviderAdapter;
export declare function getActivityProvider(preferred?: string, creds?: HotelProviderCreds): ActivityProviderAdapter;
/**
 * Legacy combined provider.
 * - With preferred key: both sides use that key (quote/booking revalidate).
 * - Without preferred: FLIGHT_PROVIDER and HOTEL_PROVIDER resolve independently.
 */
export declare function getTravelProvider(preferred?: string): TravelProviderAdapter;
export {};
//# sourceMappingURL=resolve.d.ts.map