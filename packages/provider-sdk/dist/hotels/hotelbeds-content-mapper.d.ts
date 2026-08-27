import type { HotelPropertyDetails } from "@watesly-travel/shared";
import { type GeoCenter } from "./hotelbeds-geo";
import type { HbContentHotel } from "./hotelbeds-content-types";
/** Match gallery URLs to a room code. Never borrow another room's photos. */
export declare function roomGalleryFor(roomGalleries: Record<string, string[]>, roomCode: string, hotelFallback: string[]): string[];
export declare function enrichDetailsFromContent(input: {
    details: HotelPropertyDetails;
    content?: HbContentHotel;
    searchCenter?: GeoCenter;
    facilityCatalog?: Map<string, string>;
}): HotelPropertyDetails;
//# sourceMappingURL=hotelbeds-content-mapper.d.ts.map