"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuffelHotelProvider = void 0;
const duffel_1 = require("../duffel");
/** Real hotel provider backed by Duffel Stays API. */
class DuffelHotelProvider {
    providerKey = "duffel";
    displayName = "Duffel Hotels";
    liveMode;
    inner;
    constructor(token) {
        this.inner = new duffel_1.DuffelTravelProvider(token);
        this.liveMode = this.inner.liveMode;
    }
    searchHotels(params) {
        return this.inner.searchHotels(params);
    }
    async revalidateOffer(offer) {
        const result = await this.inner.revalidateOffer(offer);
        return {
            available: result.available,
            priceChanged: result.priceChanged,
            previousCostMinor: result.previousCostMinor,
            offer: result.offer,
        };
    }
    async createBooking(_offer, _guests) {
        throw new Error("إصدار حجز فنادق Duffel الحقيقي غير مفعّل بعد — استخدم HOTEL_PROVIDER=mock أو فعّل createBooking لاحقًا");
    }
}
exports.DuffelHotelProvider = DuffelHotelProvider;
//# sourceMappingURL=duffel-hotel-provider.js.map