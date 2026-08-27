"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelportFlightProvider = void 0;
/**
 * Travelport GDS adapter scaffold.
 * Wire Universal API / JSON APIs here once enterprise credentials are available.
 */
class TravelportFlightProvider {
    providerKey = "travelport";
    displayName = "Travelport";
    liveMode;
    creds;
    constructor(creds) {
        this.creds = {
            username: creds?.username?.trim() ||
                process.env.TRAVELPORT_USER?.trim() ||
                "",
            password: creds?.password?.trim() ||
                process.env.TRAVELPORT_PASSWORD?.trim() ||
                "",
            targetBranch: creds?.targetBranch?.trim() ||
                process.env.TRAVELPORT_TARGET_BRANCH?.trim() ||
                "",
            endpoint: creds?.endpoint?.trim() ||
                process.env.TRAVELPORT_ENDPOINT?.trim() ||
                "",
        };
        this.liveMode = Boolean(this.creds.username && this.creds.password && this.creds.targetBranch);
    }
    ensureConfigured() {
        if (!this.liveMode) {
            throw new Error("مزود Travelport غير مُعدّ. أدخل Username / Password / Target Branch ثم فعّل FLIGHT_PROVIDER=travelport");
        }
    }
    async searchFlights(_params) {
        this.ensureConfigured();
        throw new Error("بحث Travelport جاهز للربط — أضف استدعاء Air Search API بمفاتيح المؤسسة. الهيكل والاعتمادات محفوظة.");
    }
    async revalidateOffer(offer) {
        this.ensureConfigured();
        return {
            available: false,
            offer,
            priceChanged: false,
            previousCostMinor: offer.costAmountMinor,
        };
    }
    async createBooking(_offer, _passengers) {
        throw new Error("حجز Travelport غير مفعّل بعد");
    }
}
exports.TravelportFlightProvider = TravelportFlightProvider;
//# sourceMappingURL=travelport-flight-provider.js.map