"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuffelFlightProvider = void 0;
/** Stub — Duffel flight provider not present in this workspace snapshot. */
class DuffelFlightProvider {
    providerKey = "duffel";
    displayName = "Duffel Flights";
    liveMode;
    constructor(_token) {
        this.liveMode = Boolean(_token || process.env.DUFFEL_ACCESS_TOKEN);
    }
    async searchFlights(_params) {
        return [];
    }
    async revalidateOffer(offer) {
        return { available: true, priceChanged: false, offer };
    }
    async createBooking(_offer, _passengers) {
        return { providerBookingRef: "", status: "failed" };
    }
}
exports.DuffelFlightProvider = DuffelFlightProvider;
//# sourceMappingURL=duffel-flight-provider.js.map