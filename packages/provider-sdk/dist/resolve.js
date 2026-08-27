"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isHotelbedsTransferKey = isHotelbedsTransferKey;
exports.resolveFlightProviderKey = resolveFlightProviderKey;
exports.resolveHotelProviderKey = resolveHotelProviderKey;
exports.resolveTransferProviderKey = resolveTransferProviderKey;
exports.resolveActivityProviderKey = resolveActivityProviderKey;
exports.resolveProviderKey = resolveProviderKey;
exports.getFlightProvider = getFlightProvider;
exports.getHotelProvider = getHotelProvider;
exports.getTransferProvider = getTransferProvider;
exports.getActivityProvider = getActivityProvider;
exports.getTravelProvider = getTravelProvider;
const hotelbeds_activity_provider_1 = require("./activities/hotelbeds-activity-provider");
const mock_activity_provider_1 = require("./activities/mock-activity-provider");
const composite_1 = require("./composite");
const amadeus_flight_provider_1 = require("./flights/amadeus-flight-provider");
const duffel_flight_provider_1 = require("./flights/duffel-flight-provider");
const mock_flight_provider_1 = require("./flights/mock-flight-provider");
const travelfusion_flight_provider_1 = require("./flights/travelfusion-flight-provider");
const travelport_flight_provider_1 = require("./flights/travelport-flight-provider");
const duffel_hotel_provider_1 = require("./hotels/duffel-hotel-provider");
const hotelbeds_hotel_provider_1 = require("./hotels/hotelbeds-hotel-provider");
const mock_hotel_provider_1 = require("./hotels/mock-hotel-provider");
const hotelbeds_transfer_provider_1 = require("./transfers/hotelbeds-transfer-provider");
const mock_transfer_provider_1 = require("./transfers/mock-transfer-provider");
function mockFallbackAllowed() {
    return process.env.TRAVEL_MOCK_ENABLED !== "false";
}
function normalizeProviderAlias(raw) {
    const key = raw.trim().toLowerCase();
    if (!key)
        return "mock";
    // "real" is a generic alias for the project's primary live API (Duffel today).
    if (key === "real")
        return "duffel";
    // Common aliases for low-cost / domestic aggregator
    if (key === "tf" || key === "lcc")
        return "travelfusion";
    if (key === "tp" || key === "galileo")
        return "travelport";
    if (key === "hotelbeds-transfers" ||
        key === "hotelbeds_transfers" ||
        key === "hotelbeds-transfer" ||
        key === "hotelbeds_transfer") {
        return "hotelbeds-transfers";
    }
    if (key === "hotelbeds-activities" ||
        key === "hotelbeds_activities" ||
        key === "hotelbeds-activity" ||
        key === "hotelbeds_activity") {
        return "hotelbeds-activities";
    }
    return key;
}
function isHotelbedsTransferKey(raw) {
    const key = normalizeProviderAlias(raw || "");
    return key === "hotelbeds-transfers";
}
/**
 * Resolve flight provider key.
 * Priority: explicit preferred → FLIGHT_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
function resolveFlightProviderKey(preferred) {
    const fromEnv = process.env.FLIGHT_PROVIDER?.trim() ||
        process.env.TRAVEL_DEFAULT_PROVIDER?.trim() ||
        "mock";
    return normalizeProviderAlias(preferred || fromEnv);
}
/**
 * Resolve hotel provider key.
 * Priority: explicit preferred → HOTEL_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
function resolveHotelProviderKey(preferred) {
    const fromEnv = process.env.HOTEL_PROVIDER?.trim() ||
        process.env.TRAVEL_DEFAULT_PROVIDER?.trim() ||
        "mock";
    return normalizeProviderAlias(preferred || fromEnv);
}
function resolveTransferProviderKey(preferred) {
    const fromEnv = process.env.TRANSFER_PROVIDER?.trim() ||
        (process.env.HOTELBEDS_TRANSFER_API_KEY?.trim()
            ? "hotelbeds-transfers"
            : "") ||
        "mock";
    const key = normalizeProviderAlias(preferred || fromEnv);
    // TRANSFER_PROVIDER=hotelbeds means the Transfers API, never the Hotels API.
    if (key === "hotelbeds")
        return "hotelbeds-transfers";
    return key;
}
function resolveActivityProviderKey(preferred) {
    const fromEnv = process.env.ACTIVITY_PROVIDER?.trim() ||
        (process.env.HOTELBEDS_ACTIVITY_API_KEY?.trim()
            ? "hotelbeds-activities"
            : "") ||
        "mock";
    const key = normalizeProviderAlias(preferred || fromEnv);
    if (key === "hotelbeds")
        return "hotelbeds-activities";
    return key;
}
/** @deprecated Use resolveFlightProviderKey / resolveHotelProviderKey */
function resolveProviderKey(preferred) {
    const fromEnv = process.env.TRAVEL_DEFAULT_PROVIDER?.trim();
    return normalizeProviderAlias(preferred || fromEnv || "mock");
}
function requireDuffelToken(kind) {
    const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
    if (token)
        return token;
    throw new Error(kind === "flight"
        ? "FLIGHT_PROVIDER=duffel/real يتطلب DUFFEL_ACCESS_TOKEN في .env"
        : "HOTEL_PROVIDER=duffel/real يتطلب DUFFEL_ACCESS_TOKEN في .env");
}
function getFlightProvider(preferred, creds) {
    const key = resolveFlightProviderKey(preferred);
    if (key === "mock") {
        return new mock_flight_provider_1.MockFlightProvider();
    }
    if (key === "duffel") {
        try {
            const token = creds?.accessToken?.trim() || requireDuffelToken("flight");
            return new duffel_flight_provider_1.DuffelFlightProvider(token);
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_flight_provider_1.MockFlightProvider();
            throw err;
        }
    }
    if (key === "amadeus") {
        try {
            const provider = new amadeus_flight_provider_1.AmadeusFlightProvider({
                clientId: creds?.clientId,
                clientSecret: creds?.clientSecret,
                hostname: creds?.hostname,
            });
            if (!provider.liveMode) {
                throw new Error("FLIGHT_PROVIDER=amadeus يتطلب AMADEUS_CLIENT_ID و AMADEUS_CLIENT_SECRET");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_flight_provider_1.MockFlightProvider();
            throw err;
        }
    }
    if (key === "travelport") {
        try {
            const provider = new travelport_flight_provider_1.TravelportFlightProvider({
                username: creds?.username,
                password: creds?.password,
                targetBranch: creds?.targetBranch,
                endpoint: creds?.endpoint,
            });
            if (!provider.liveMode) {
                throw new Error("FLIGHT_PROVIDER=travelport يتطلب TRAVELPORT_USER و TRAVELPORT_PASSWORD و TRAVELPORT_TARGET_BRANCH");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_flight_provider_1.MockFlightProvider();
            throw err;
        }
    }
    if (key === "travelfusion") {
        try {
            const provider = new travelfusion_flight_provider_1.TravelfusionFlightProvider({
                username: creds?.username,
                password: creds?.password,
                loginId: creds?.loginId,
            });
            if (!provider.liveMode) {
                throw new Error("FLIGHT_PROVIDER=travelfusion يتطلب TRAVELFUSION_USERNAME و TRAVELFUSION_PASSWORD");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_flight_provider_1.MockFlightProvider();
            throw err;
        }
    }
    if (mockFallbackAllowed())
        return new mock_flight_provider_1.MockFlightProvider();
    throw new Error(`مزود طيران غير معروف: ${key}`);
}
function getHotelProvider(preferred, creds) {
    const key = resolveHotelProviderKey(preferred);
    if (key === "mock") {
        return new mock_hotel_provider_1.MockHotelProvider();
    }
    if (key === "duffel") {
        try {
            const token = creds?.accessToken?.trim() || requireDuffelToken("hotel");
            return new duffel_hotel_provider_1.DuffelHotelProvider(token);
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_hotel_provider_1.MockHotelProvider();
            throw err;
        }
    }
    if (key === "hotelbeds") {
        try {
            const provider = new hotelbeds_hotel_provider_1.HotelbedsHotelProvider({
                apiKey: creds?.apiKey,
                apiSecret: creds?.apiSecret,
                baseUrl: creds?.baseUrl,
            });
            if (!provider.liveMode) {
                throw new Error("HOTEL_PROVIDER=hotelbeds يتطلب HOTELBEDS_API_KEY و HOTELBEDS_API_SECRET");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_hotel_provider_1.MockHotelProvider();
            throw err;
        }
    }
    // Flight-only / transfer-only keys are not hotel adapters.
    if (mockFallbackAllowed())
        return new mock_hotel_provider_1.MockHotelProvider();
    throw new Error(`مزود فنادق غير معروف: ${key}`);
}
function getTransferProvider(preferred, creds) {
    const key = resolveTransferProviderKey(preferred);
    if (key === "mock") {
        return new mock_transfer_provider_1.MockTransferProvider();
    }
    if (key === "hotelbeds" || key === "hotelbeds-transfers") {
        try {
            const provider = new hotelbeds_transfer_provider_1.HotelbedsTransferProvider({
                apiKey: creds?.apiKey,
                apiSecret: creds?.apiSecret,
                baseUrl: creds?.baseUrl,
            });
            if (!provider.liveMode) {
                throw new Error("TRANSFER_PROVIDER=hotelbeds-transfers يتطلب HOTELBEDS_TRANSFER_API_KEY و HOTELBEDS_TRANSFER_API_SECRET");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_transfer_provider_1.MockTransferProvider();
            throw err;
        }
    }
    if (mockFallbackAllowed())
        return new mock_transfer_provider_1.MockTransferProvider();
    throw new Error(`مزود مواصلات غير معروف: ${key}`);
}
function getActivityProvider(preferred, creds) {
    const key = resolveActivityProviderKey(preferred);
    if (key === "mock") {
        return new mock_activity_provider_1.MockActivityProvider();
    }
    if (key === "hotelbeds" || key === "hotelbeds-activities") {
        try {
            const provider = new hotelbeds_activity_provider_1.HotelbedsActivityProvider({
                apiKey: creds?.apiKey,
                apiSecret: creds?.apiSecret,
                baseUrl: creds?.baseUrl,
            });
            if (!provider.liveMode) {
                throw new Error("ACTIVITY_PROVIDER=hotelbeds-activities يتطلب HOTELBEDS_ACTIVITY_API_KEY و HOTELBEDS_ACTIVITY_API_SECRET");
            }
            return provider;
        }
        catch (err) {
            if (mockFallbackAllowed())
                return new mock_activity_provider_1.MockActivityProvider();
            throw err;
        }
    }
    if (mockFallbackAllowed())
        return new mock_activity_provider_1.MockActivityProvider();
    throw new Error(`مزود أنشطة غير معروف: ${key}`);
}
/**
 * Legacy combined provider.
 * - With preferred key: both sides use that key (quote/booking revalidate).
 * - Without preferred: FLIGHT_PROVIDER and HOTEL_PROVIDER resolve independently.
 */
function getTravelProvider(preferred) {
    if (preferred?.trim()) {
        const key = normalizeProviderAlias(preferred);
        return new composite_1.CompositeTravelProvider(getFlightProvider(key), getHotelProvider(key));
    }
    return new composite_1.CompositeTravelProvider(getFlightProvider(), getHotelProvider());
}
//# sourceMappingURL=resolve.js.map