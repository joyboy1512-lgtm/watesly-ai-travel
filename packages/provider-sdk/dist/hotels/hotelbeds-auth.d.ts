export type HotelbedsCredentials = {
    apiKey: string;
    apiSecret: string;
    baseUrl?: string;
};
export declare function resolveHotelbedsCredentials(creds?: Partial<HotelbedsCredentials>): HotelbedsCredentials;
export declare function resolveHotelbedsActivityCredentials(creds?: Partial<HotelbedsCredentials>): HotelbedsCredentials;
export declare function resolveHotelbedsTransferCredentials(creds?: Partial<HotelbedsCredentials>): HotelbedsCredentials;
export declare function hotelbedsSignature(apiKey: string, apiSecret: string): string;
export declare function hotelbedsHeaders(creds: HotelbedsCredentials): Record<string, string>;
//# sourceMappingURL=hotelbeds-auth.d.ts.map