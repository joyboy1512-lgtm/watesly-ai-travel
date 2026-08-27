"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AmadeusFlightProvider = void 0;
const types_1 = require("../types");
/**
 * Amadeus Self-Service Flight Offers Search.
 * Activates when AMADEUS_CLIENT_ID + AMADEUS_CLIENT_SECRET (or constructor creds) are set.
 */
class AmadeusFlightProvider {
    providerKey = "amadeus";
    displayName = "Amadeus";
    liveMode;
    clientId;
    clientSecret;
    hostname;
    tokenCache = null;
    constructor(creds) {
        this.clientId =
            creds?.clientId?.trim() ||
                process.env.AMADEUS_CLIENT_ID?.trim() ||
                "";
        this.clientSecret =
            creds?.clientSecret?.trim() ||
                process.env.AMADEUS_CLIENT_SECRET?.trim() ||
                "";
        this.hostname = (creds?.hostname?.trim() ||
            process.env.AMADEUS_HOSTNAME?.trim() ||
            "test.api.amadeus.com").replace(/^https?:\/\//, "");
        this.liveMode = Boolean(this.clientId && this.clientSecret);
    }
    ensureConfigured() {
        if (!this.clientId || !this.clientSecret) {
            throw new Error("مزود Amadeus غير مُعدّ. أدخل Client ID و Client Secret أو عيّن AMADEUS_CLIENT_ID / AMADEUS_CLIENT_SECRET");
        }
    }
    async getAccessToken() {
        this.ensureConfigured();
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
            return this.tokenCache.accessToken;
        }
        const body = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.clientId,
            client_secret: this.clientSecret,
        });
        const res = await fetch(`https://${this.hostname}/v1/security/oauth2/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        const json = (await res.json().catch(() => ({})));
        if (!res.ok || !json.access_token) {
            throw new Error(json.error_description ||
                json.title ||
                `فشل توثيق Amadeus (HTTP ${res.status})`);
        }
        this.tokenCache = {
            accessToken: json.access_token,
            expiresAt: Date.now() + (json.expires_in || 1799) * 1000,
        };
        return json.access_token;
    }
    cabinToAmadeus(cabin) {
        const c = (cabin || "economy").toLowerCase();
        if (c.includes("first"))
            return "FIRST";
        if (c.includes("business"))
            return "BUSINESS";
        if (c.includes("premium"))
            return "PREMIUM_ECONOMY";
        return "ECONOMY";
    }
    async searchFlights(params) {
        const token = await this.getAccessToken();
        const currency = (params.currency || "KWD").toUpperCase();
        const qs = new URLSearchParams({
            originLocationCode: params.origin.toUpperCase(),
            destinationLocationCode: params.destination.toUpperCase(),
            departureDate: params.departDate.slice(0, 10),
            adults: String(Math.max(1, params.adults || 1)),
            currencyCode: currency,
            max: "30",
            travelClass: this.cabinToAmadeus(params.cabinClass),
        });
        if (params.returnDate) {
            qs.set("returnDate", params.returnDate.slice(0, 10));
        }
        if (params.children)
            qs.set("children", String(params.children));
        if (params.infants)
            qs.set("infants", String(params.infants));
        const res = await fetch(`https://${this.hostname}/v2/shopping/flight-offers?${qs.toString()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        const json = (await res.json().catch(() => ({})));
        if (!res.ok) {
            const msg = json.errors?.[0]?.detail ||
                json.errors?.[0]?.title ||
                `فشل بحث Amadeus (HTTP ${res.status})`;
            throw new Error(msg);
        }
        const rows = Array.isArray(json.data) ? json.data : [];
        return rows.map((row, index) => {
            const price = (row.price || {});
            const cur = (price.currency || currency).toUpperCase();
            const total = price.total || "0";
            const id = String(row.id || "") ||
                `amadeus_${params.origin}_${params.destination}_${index}`;
            const itineraries = Array.isArray(row.itineraries) ? row.itineraries : [];
            const firstSeg = (itineraries[0]
                ?.segments || [])[0] || {};
            const carrier = String(firstSeg.carrierCode ||
                row.validatingAirlineCodes?.[0] ||
                "XX").toUpperCase();
            return {
                providerKey: this.providerKey,
                providerOfferRef: id,
                description: `Amadeus · ${carrier} · ${params.origin.toUpperCase()}→${params.destination.toUpperCase()}`,
                costAmountMinor: (0, types_1.amountToMinor)(total, cur),
                currency: cur,
                revalidationToken: id,
                expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                raw: {
                    provider: "amadeus",
                    offer: row,
                    hostname: this.hostname,
                },
            };
        });
    }
    async revalidateOffer(offer) {
        // Amadeus pricing confirmation can be added later via flight-offers/pricing
        return {
            available: true,
            offer,
            priceChanged: false,
            previousCostMinor: offer.costAmountMinor,
        };
    }
    async createBooking(_offer, _passengers) {
        throw new Error("إصدار حجز Amadeus غير مفعّل بعد — فعّل Flight Create Orders لاحقًا");
    }
}
exports.AmadeusFlightProvider = AmadeusFlightProvider;
//# sourceMappingURL=amadeus-flight-provider.js.map