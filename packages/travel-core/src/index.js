"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProviderKey = exports.getTravelProvider = void 0;
exports.searchAndPriceFlights = searchAndPriceFlights;
exports.searchAndPriceHotels = searchAndPriceHotels;
exports.searchAndPriceTravel = searchAndPriceTravel;
exports.revalidatePricedOffer = revalidatePricedOffer;
var pricing_engine_1 = require("@watesly-travel/pricing-engine");
var provider_sdk_1 = require("@watesly-travel/provider-sdk");
Object.defineProperty(exports, "getTravelProvider", { enumerable: true, get: function () { return provider_sdk_1.getTravelProvider; } });
Object.defineProperty(exports, "resolveProviderKey", { enumerable: true, get: function () { return provider_sdk_1.resolveProviderKey; } });
function priceOffers(offers, serviceType, rules) {
    var rule = (0, pricing_engine_1.selectPricingRule)(rules, serviceType);
    return offers.map(function (offer) {
        var pricing = (0, pricing_engine_1.applyPricingRule)({
            costAmountMinor: offer.costAmountMinor,
            currency: offer.currency,
            serviceType: serviceType,
            rule: rule,
        });
        return {
            offer: offer,
            serviceType: serviceType,
            pricing: pricing,
            customerVisible: (0, pricing_engine_1.toCustomerVisible)({
                sellAmountMinor: pricing.sellAmountMinor,
                currency: pricing.currency,
                summary: offer.description,
                expiresAt: offer.expiresAt,
            }),
        };
    });
}
function searchAndPriceFlights(input) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, offers;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    provider = (_a = input.provider) !== null && _a !== void 0 ? _a : (0, provider_sdk_1.getTravelProvider)(input.providerKey || "mock");
                    return [4 /*yield*/, provider.searchFlights(input.params)];
                case 1:
                    offers = _b.sent();
                    return [2 /*return*/, priceOffers(offers, "flight", input.rules)];
            }
        });
    });
}
function searchAndPriceHotels(input) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, offers;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    provider = (_a = input.provider) !== null && _a !== void 0 ? _a : (0, provider_sdk_1.getTravelProvider)(input.providerKey || "mock");
                    if (!provider.searchHotels) {
                        throw new Error("\u0627\u0644\u0645\u0632\u0648\u062F ".concat(provider.providerKey, " \u0644\u0627 \u064A\u062F\u0639\u0645 \u0627\u0644\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0641\u0646\u0627\u062F\u0642"));
                    }
                    return [4 /*yield*/, provider.searchHotels(input.params)];
                case 1:
                    offers = _b.sent();
                    return [2 /*return*/, priceOffers(offers, "hotel", input.rules)];
            }
        });
    });
}
function searchAndPriceTravel(input) {
    return __awaiter(this, void 0, void 0, function () {
        var key, provider, wantFlights, wantHotels, hotelError, flights, _a, hotels, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    key = (0, provider_sdk_1.resolveProviderKey)(input.providerKey);
                    provider = (0, provider_sdk_1.getTravelProvider)(key);
                    wantFlights = input.searchFlights !== false && Boolean(input.flightParams);
                    wantHotels = Boolean(input.searchHotels && input.hotelParams);
                    hotelError = null;
                    if (!(wantFlights && input.flightParams)) return [3 /*break*/, 2];
                    return [4 /*yield*/, searchAndPriceFlights({
                            provider: provider,
                            params: input.flightParams,
                            rules: input.rules,
                        })];
                case 1:
                    _a = _b.sent();
                    return [3 /*break*/, 3];
                case 2:
                    _a = [];
                    _b.label = 3;
                case 3:
                    flights = _a;
                    hotels = [];
                    if (!(wantHotels && input.hotelParams)) return [3 /*break*/, 7];
                    _b.label = 4;
                case 4:
                    _b.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, searchAndPriceHotels({
                            provider: provider,
                            params: input.hotelParams,
                            rules: input.rules,
                        })];
                case 5:
                    hotels = _b.sent();
                    return [3 /*break*/, 7];
                case 6:
                    err_1 = _b.sent();
                    // Hotels may be unavailable on some Duffel accounts; keep flight results.
                    hotelError = err_1 instanceof Error ? err_1.message : "فشل بحث الفنادق";
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/, {
                        providerKey: provider.providerKey,
                        providerName: provider.displayName,
                        liveMode: provider.liveMode,
                        flights: flights,
                        hotels: hotels,
                        hotelError: hotelError,
                    }];
            }
        });
    });
}
function revalidatePricedOffer(input) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, result, serviceType, rule, pricing;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    provider = (0, provider_sdk_1.getTravelProvider)(input.providerKey || input.offer.providerKey);
                    return [4 /*yield*/, provider.revalidateOffer(input.offer)];
                case 1:
                    result = _b.sent();
                    serviceType = input.serviceType ||
                        (input.offer.providerOfferRef.startsWith("off_") ||
                            ((_a = input.offer.raw) === null || _a === void 0 ? void 0 : _a.airline)
                            ? "flight"
                            : "hotel");
                    rule = (0, pricing_engine_1.selectPricingRule)(input.rules, serviceType);
                    pricing = (0, pricing_engine_1.applyPricingRule)({
                        costAmountMinor: result.offer.costAmountMinor,
                        currency: result.offer.currency,
                        serviceType: serviceType,
                        rule: rule,
                    });
                    return [2 /*return*/, __assign(__assign({}, result), { pricing: pricing, customerVisible: (0, pricing_engine_1.toCustomerVisible)({
                                sellAmountMinor: pricing.sellAmountMinor,
                                currency: pricing.currency,
                                summary: result.offer.description,
                                expiresAt: result.offer.expiresAt,
                            }) })];
            }
        });
    });
}
