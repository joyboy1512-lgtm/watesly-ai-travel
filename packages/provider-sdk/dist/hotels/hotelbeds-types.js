"use strict";
/** Hotelbeds Booking API availability shapes (subset used by WeekendGate). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotelsFromHotelbedsPayload = hotelsFromHotelbedsPayload;
function hotelsFromHotelbedsPayload(json) {
    if (json.hotel && (json.hotel.code != null || json.hotel.rooms)) {
        return [json.hotel];
    }
    return json.hotels?.hotels || [];
}
//# sourceMappingURL=hotelbeds-types.js.map