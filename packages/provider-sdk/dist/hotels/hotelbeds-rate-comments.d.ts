import { type HotelbedsCredentials } from "./hotelbeds-auth";
export declare function parseRateCommentsId(id: string, fallbackDate?: string): {
    code: string;
    date: string;
} | null;
export declare function fetchHotelbedsRateComments(creds: HotelbedsCredentials, ids: string[], fallbackDate: string, limit?: number): Promise<Record<string, string>>;
export declare function rateCommentsFromHb(value: string | string[] | undefined): string | undefined;
//# sourceMappingURL=hotelbeds-rate-comments.d.ts.map