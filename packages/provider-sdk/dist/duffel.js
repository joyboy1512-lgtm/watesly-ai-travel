"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuffelTravelProvider = void 0;
/** Stub — Duffel module not present in this workspace snapshot. */
class DuffelTravelProvider {
    providerKey = "duffel";
    displayName = "Duffel";
    liveMode;
    constructor(token) {
        this.liveMode = Boolean(token || process.env.DUFFEL_ACCESS_TOKEN);
    }
    async searchFlights(_params) {
        return [];
    }
    async searchHotels(_params) {
        return [];
    }
    async revalidateOffer(offer) {
        return {
            available: true,
            priceChanged: false,
            offer,
        };
    }
    async createBooking() {
        return { providerBookingRef: "", status: "failed" };
    }
}
exports.DuffelTravelProvider = DuffelTravelProvider;
//# sourceMappingURL=duffel.js.map