"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelfusionFlightProvider = void 0;
/**
 * Travelfusion adapter scaffold — covers many LCCs and domestic airlines.
 * XML API endpoints will be wired once login credentials are provided.
 */
class TravelfusionFlightProvider {
    providerKey = "travelfusion";
    displayName = "Travelfusion";
    liveMode;
    creds;
    constructor(creds) {
        this.creds = {
            username: creds?.username?.trim() ||
                process.env.TRAVELFUSION_USERNAME?.trim() ||
                "",
            password: creds?.password?.trim() ||
                process.env.TRAVELFUSION_PASSWORD?.trim() ||
                "",
            loginId: creds?.loginId?.trim() ||
                process.env.TRAVELFUSION_LOGIN_ID?.trim() ||
                "",
        };
        this.liveMode = Boolean(this.creds.username && this.creds.password);
    }
    ensureConfigured() {
        if (!this.liveMode) {
            throw new Error("مزود Travelfusion غير مُعدّ. أدخل Username و Password ثم فعّل FLIGHT_PROVIDER=travelfusion");
        }
    }
    async searchFlights(_params) {
        this.ensureConfigured();
        throw new Error("بحث Travelfusion جاهز للربط (LCC + داخلي) — أضف StartRouting / CheckRouting XML بعد تزويد بيانات الدخول.");
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
        throw new Error("حجز Travelfusion غير مفعّل بعد");
    }
}
exports.TravelfusionFlightProvider = TravelfusionFlightProvider;
//# sourceMappingURL=travelfusion-flight-provider.js.map