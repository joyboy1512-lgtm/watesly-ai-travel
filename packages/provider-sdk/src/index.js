"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuffelTravelProvider = exports.MockTravelProvider = void 0;
exports.resolveProviderKey = resolveProviderKey;
exports.getTravelProvider = getTravelProvider;
var duffel_1 = require("./duffel");
var mock_1 = require("./mock");
__exportStar(require("./types"), exports);
__exportStar(require("./locations"), exports);
var mock_2 = require("./mock");
Object.defineProperty(exports, "MockTravelProvider", { enumerable: true, get: function () { return mock_2.MockTravelProvider; } });
var duffel_2 = require("./duffel");
Object.defineProperty(exports, "DuffelTravelProvider", { enumerable: true, get: function () { return duffel_2.DuffelTravelProvider; } });
function resolveProviderKey(preferred) {
    var _a, _b, _c;
    var fromEnv = (_a = process.env.TRAVEL_DEFAULT_PROVIDER) === null || _a === void 0 ? void 0 : _a.trim();
    var key = (preferred || fromEnv || "mock").toLowerCase();
    if (key === "duffel")
        return "duffel";
    if (key === "mock") {
        // Prefer real Duffel automatically when a token is present.
        if ((_b = process.env.DUFFEL_ACCESS_TOKEN) === null || _b === void 0 ? void 0 : _b.trim())
            return "duffel";
        return "mock";
    }
    if (((_c = process.env.DUFFEL_ACCESS_TOKEN) === null || _c === void 0 ? void 0 : _c.trim()) && key !== "mock")
        return "duffel";
    return key;
}
function getTravelProvider(providerKey) {
    var _a;
    if (providerKey === void 0) { providerKey = "mock"; }
    var key = resolveProviderKey(providerKey);
    if (key === "duffel") {
        var token = (_a = process.env.DUFFEL_ACCESS_TOKEN) === null || _a === void 0 ? void 0 : _a.trim();
        if (!token) {
            if (process.env.TRAVEL_MOCK_ENABLED !== "false") {
                return new mock_1.MockTravelProvider();
            }
            throw new Error("المزود الحقيقي Duffel مفعّل لكن DUFFEL_ACCESS_TOKEN غير موجود في .env");
        }
        return new duffel_1.DuffelTravelProvider(token);
    }
    return new mock_1.MockTravelProvider();
}
