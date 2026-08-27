"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockActivityProvider = void 0;
const shared_1 = require("@watesly-travel/shared");
const locations_1 = require("../locations");
const types_1 = require("../types");
class MockActivityProvider {
    providerKey = "mock";
    displayName = "Mock Activities";
    liveMode = false;
    async searchActivities(params) {
        const destination = (0, locations_1.cityDefaultAirport)(params.destination) || params.destination.trim() || "DXB";
        const currency = "KWD";
        const fetchedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const rows = [
            {
                id: "desert-safari",
                type: "TOUR",
                name: "رحلة صحراوية وعشاء",
                major: 22,
                duration: "نصف يوم",
            },
            {
                id: "city-tour",
                type: "TICKET",
                name: "جولة المدينة والمعالم",
                major: 14,
                duration: "4 ساعات",
            },
            {
                id: "cruise",
                type: "TOUR",
                name: "رحلة بحرية عند الغروب",
                major: 31,
                duration: "3 ساعات",
            },
        ];
        return rows.map((row) => ({
            providerKey: "mock",
            providerOfferRef: `mock-act-${row.id}`,
            description: `${(0, shared_1.activityTypeLabelAr)(row.type)} · ${row.name} · ${destination}`,
            costAmountMinor: (0, types_1.amountToMinor)(row.major * Math.max(1, params.adults || 1), currency),
            currency,
            revalidationToken: JSON.stringify({ activityCode: row.id }),
            expiresAt,
            raw: {
                provider: "mock",
                liveMode: false,
                source: "mock",
                sourceLabel: "تجريبي",
                fetchedAt,
                activityCode: row.id,
                activityName: row.name,
                activityType: row.type,
                activityTypeLabel: (0, shared_1.activityTypeLabelAr)(row.type),
                destinationCode: destination,
                destinationName: destination,
                summary: row.name,
                durationLabel: row.duration,
                freeCancellation: row.type !== "TICKET",
                description: row.name,
            },
        }));
    }
    async createBooking(offer, _guests) {
        return {
            providerBookingRef: `ACT-MOCK-${offer.providerOfferRef.slice(-6)}`,
            status: "confirmed",
        };
    }
}
exports.MockActivityProvider = MockActivityProvider;
//# sourceMappingURL=mock-activity-provider.js.map