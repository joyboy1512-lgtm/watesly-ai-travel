import { type HotelbedsCredentials } from "./hotelbeds-auth";
import type { HbContentHotel } from "./hotelbeds-content-types";
export declare function hotelbedsImageUrl(path?: string, size?: "medium" | "bigger" | "xl"): string | undefined;
export declare function fetchHotelbedsContentMap(creds: HotelbedsCredentials, codes: number[]): Promise<Map<number, HbContentHotel>>;
export declare function pickPrimaryHotelImage(hotel?: HbContentHotel): string | undefined;
/** Match availability room codes (e.g. DBL.ST-1) to content room codes (DBL.ST). */
export declare function resolveContentRoomCode(content: HbContentHotel | undefined, roomCode: string | undefined): string | undefined;
export declare function pickRoomImages(hotel?: HbContentHotel): Record<string, string>;
export declare function pickRoomImageLists(hotel?: HbContentHotel): Record<string, string[]>;
export declare function fetchHotelbedsFacilityCatalog(creds: HotelbedsCredentials): Promise<Map<string, string>>;
//# sourceMappingURL=hotelbeds-content-client.d.ts.map