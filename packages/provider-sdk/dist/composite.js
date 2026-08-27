"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompositeTravelProvider = void 0;
exports.isHotelOffer = isHotelOffer;
/** Combines independent flight + hotel providers into the legacy TravelProviderAdapter. */
class CompositeTravelProvider {
    flights;
    hotels;
    providerKey;
    displayName;
    liveMode;
    constructor(flights, hotels) {
        this.flights = flights;
        this.hotels = hotels;
        const same = flights.providerKey === hotels.providerKey;
        this.providerKey = same
            ? flights.providerKey
            : `${flights.providerKey}+${hotels.providerKey}`;
        this.displayName = same
            ? flights.displayName
            : `طيران: ${flights.displayName} · فنادق: ${hotels.displayName}`;
        this.liveMode = flights.liveMode || hotels.liveMode;
    }
    get flightProvider() {
        return this.flights;
    }
    get hotelProvider() {
        return this.hotels;
    }
    searchFlights(params) {
        return this.flights.searchFlights(params);
    }
    searchHotels(params) {
        return this.hotels.searchHotels(params);
    }
    async revalidateOffer(offer) {
        if (isHotelOffer(offer)) {
            return this.hotels.revalidateOffer(offer);
        }
        return this.flights.revalidateOffer(offer);
    }
    async createBooking(offer, passengers) {
        if (isHotelOffer(offer)) {
            if (!this.hotels.createBooking) {
                throw new Error(`مزود الفنادق ${this.hotels.providerKey} لا يدعم الحجز`);
            }
            return this.hotels.createBooking(offer, passengers);
        }
        if (!this.flights.createBooking) {
            throw new Error(`مزود الطيران ${this.flights.providerKey} لا يدعم الحجز`);
        }
        return this.flights.createBooking(offer, passengers);
    }
}
exports.CompositeTravelProvider = CompositeTravelProvider;
function isHotelOffer(offer) {
    const ref = offer.providerOfferRef || "";
    if (ref.includes("HTL") || ref.startsWith("acc_") || ref.includes("stay")) {
        return true;
    }
    if (ref.startsWith("off_") || ref.includes("FLT")) {
        return false;
    }
    const raw = offer.raw || {};
    if (raw.airline || raw.airlineCode || raw.segments)
        return false;
    if (raw.name || raw.stars || raw.roomType || raw.checkInDate)
        return true;
    return false;
}
//# sourceMappingURL=composite.js.map