"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTransferProvider = void 0;
const shared_1 = require("@watesly-travel/shared");
const locations_1 = require("../locations");
const types_1 = require("../types");
class MockTransferProvider {
    providerKey = "mock";
    displayName = "Mock Transfers";
    liveMode = false;
    async searchTransfers(params) {
        const city = params.city?.trim() || "";
        const from = params.from.trim() || (0, locations_1.cityDefaultAirport)(city) || "KWI";
        const to = params.to.trim() || city || "DXB";
        const currency = "KWD";
        const fetchedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const rows = [
            { id: "priv-sedan", type: "PRIVATE", vehicle: "سيدان خاصة", major: 18, maxPax: 3 },
            { id: "priv-van", type: "PRIVATE", vehicle: "فان عائلية", major: 26, maxPax: 7 },
            { id: "shared", type: "SHARED", vehicle: "نقل مشترك", major: 9, maxPax: 10 },
        ];
        return rows.map((row) => ({
            providerKey: "mock",
            providerOfferRef: `mock-trf-${row.id}`,
            description: `${(0, shared_1.transferTypeLabelAr)(row.type)} · ${row.vehicle} · ${from} → ${to}`,
            costAmountMinor: (0, types_1.amountToMinor)(row.major, currency),
            currency,
            revalidationToken: JSON.stringify({ rateKey: row.id }),
            expiresAt,
            raw: {
                provider: "mock",
                liveMode: false,
                source: "mock",
                sourceLabel: "تجريبي",
                fetchedAt,
                transferType: row.type,
                transferTypeLabel: (0, shared_1.transferTypeLabelAr)(row.type),
                vehicleName: row.vehicle,
                fromLabel: from,
                toLabel: to,
                fromType: params.fromKind || "IATA",
                toType: params.toKind || "GPS",
                city: city || undefined,
                outboundAt: `${params.outboundDate}T${params.outboundTime || "10:00"}:00`,
                inboundAt: params.inboundDate
                    ? `${params.inboundDate}T${params.inboundTime || "18:00"}:00`
                    : undefined,
                maxPax: row.maxPax,
                freeCancellation: row.type !== "SHARED",
            },
        }));
    }
    async createBooking(offer, _guests) {
        return {
            providerBookingRef: `TRF-MOCK-${offer.providerOfferRef.slice(-6)}`,
            status: "confirmed",
        };
    }
}
exports.MockTransferProvider = MockTransferProvider;
//# sourceMappingURL=mock-transfer-provider.js.map