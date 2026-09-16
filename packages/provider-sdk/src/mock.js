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
exports.MockTravelProvider = void 0;
var locations_1 = require("./locations");
function hashSeed(input) {
    var h = 0;
    for (var i = 0; i < input.length; i += 1) {
        h = (h * 31 + input.charCodeAt(i)) >>> 0;
    }
    return h;
}
var MockTravelProvider = /** @class */ (function () {
    function MockTravelProvider() {
        this.providerKey = "mock";
        this.displayName = "مزود تجريبي (Mock)";
        this.liveMode = false;
    }
    MockTravelProvider.prototype.searchFlights = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var seed, currency, majorBase, exp, factor, base, expiresAt, adults;
            var _a;
            return __generator(this, function (_b) {
                seed = hashSeed("".concat(params.origin, "-").concat(params.destination, "-").concat(params.departDate, "-").concat(params.adults));
                currency = (params.currency || "KWD").toUpperCase();
                majorBase = currency === "KWD" || currency === "BHD" || currency === "OMR"
                    ? 42 + (seed % 55)
                    : 450 + (seed % 350);
                exp = currency === "KWD" || currency === "BHD" || currency === "OMR" ? 3 : 2;
                factor = Math.pow(10, exp);
                base = Math.round(majorBase * factor);
                expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
                adults = Math.max(1, params.adults);
                return [2 /*return*/, [
                        {
                            providerKey: this.providerKey,
                            providerOfferRef: "MOCK-FLT-".concat(seed.toString(16).toUpperCase()),
                            description: "Kuwait Airways ".concat(params.origin, " \u2192 ").concat(params.destination, " \u00B7 ").concat(params.departDate, " \u00B7 ").concat(adults, " \u0628\u0627\u0644\u063A"),
                            costAmountMinor: base * adults,
                            currency: currency,
                            revalidationToken: "rv_".concat(seed),
                            expiresAt: expiresAt,
                            raw: {
                                provider: "mock",
                                liveMode: false,
                                airline: "Kuwait Airways",
                                airlineCode: "KU",
                                cabin: params.cabinClass || "economy",
                                duration: "03:15",
                                stops: 0,
                                departAt: "".concat(params.departDate, "T08:40"),
                                arriveAt: "".concat(params.departDate, "T11:55"),
                                segments: [
                                    {
                                        from: params.origin.toUpperCase(),
                                        to: params.destination.toUpperCase(),
                                        date: params.departDate,
                                        departAt: "".concat(params.departDate, "T08:40"),
                                        arriveAt: "".concat(params.departDate, "T11:55"),
                                        departTime: "08:40",
                                        arriveTime: "11:55",
                                        flightNumber: "KU".concat(100 + (seed % 800)),
                                        airline: "Kuwait Airways",
                                    },
                                ],
                                returnDate: (_a = params.returnDate) !== null && _a !== void 0 ? _a : null,
                            },
                        },
                        {
                            providerKey: this.providerKey,
                            providerOfferRef: "MOCK-FLT-".concat((seed + 7).toString(16).toUpperCase()),
                            description: "\u0637\u064A\u0631\u0627\u0646 \u062A\u062C\u0631\u064A\u0628\u064A \u0645\u0631\u0646 ".concat(params.origin, " \u2192 ").concat(params.destination, " \u00B7 ").concat(params.departDate),
                            costAmountMinor: Math.round(base * 1.18) * adults,
                            currency: currency,
                            revalidationToken: "rv_".concat(seed + 7),
                            expiresAt: expiresAt,
                            raw: {
                                provider: "mock",
                                liveMode: false,
                                airline: "flynas",
                                airlineCode: "XY",
                                cabin: params.cabinClass || "economy",
                                duration: "05:40",
                                stops: 1,
                                flexible: true,
                                departAt: "".concat(params.departDate, "T13:10"),
                                arriveAt: "".concat(params.departDate, "T18:50"),
                                segments: [
                                    {
                                        from: params.origin.toUpperCase(),
                                        to: "BAH",
                                        date: params.departDate,
                                        departAt: "".concat(params.departDate, "T13:10"),
                                        arriveAt: "".concat(params.departDate, "T14:20"),
                                        departTime: "13:10",
                                        arriveTime: "14:20",
                                        flightNumber: "XY".concat(200 + (seed % 700)),
                                        airline: "flynas",
                                    },
                                    {
                                        from: "BAH",
                                        to: params.destination.toUpperCase(),
                                        date: params.departDate,
                                        departAt: "".concat(params.departDate, "T16:00"),
                                        arriveAt: "".concat(params.departDate, "T18:50"),
                                        departTime: "16:00",
                                        arriveTime: "18:50",
                                        flightNumber: "XY".concat(300 + (seed % 700)),
                                        airline: "flynas",
                                    },
                                ],
                            },
                        },
                        {
                            providerKey: this.providerKey,
                            providerOfferRef: "MOCK-FLT-".concat((seed + 13).toString(16).toUpperCase()),
                            description: "Emirates ".concat(params.origin, " \u2192 ").concat(params.destination),
                            costAmountMinor: Math.round(base * 1.35) * adults,
                            currency: currency,
                            revalidationToken: "rv_".concat(seed + 13),
                            expiresAt: expiresAt,
                            raw: {
                                provider: "mock",
                                liveMode: false,
                                airline: "Emirates",
                                airlineCode: "EK",
                                cabin: params.cabinClass || "economy",
                                duration: "03:05",
                                stops: 0,
                                departAt: "".concat(params.departDate, "T09:30"),
                                arriveAt: "".concat(params.departDate, "T12:35"),
                                segments: [
                                    {
                                        from: params.origin.toUpperCase(),
                                        to: params.destination.toUpperCase(),
                                        date: params.departDate,
                                        departAt: "".concat(params.departDate, "T09:30"),
                                        arriveAt: "".concat(params.departDate, "T12:35"),
                                        departTime: "09:30",
                                        arriveTime: "12:35",
                                        flightNumber: "EK".concat(400 + (seed % 500)),
                                        airline: "Emirates",
                                    },
                                ],
                            },
                        },
                    ]];
            });
        });
    };
    MockTravelProvider.prototype.searchHotels = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var geo, seed, currency, expiresAt, nights, nightMajor, exp, baseNight, hotels;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, locations_1.geocodeLocation)(params.location)];
                    case 1:
                        geo = _a.sent();
                        seed = hashSeed("".concat(params.location, "-").concat(params.checkInDate, "-").concat(params.checkOutDate, "-").concat(params.adults));
                        currency = (params.currency || "KWD").toUpperCase();
                        expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();
                        nights = Math.max(1, Math.round((new Date(params.checkOutDate).getTime() -
                            new Date(params.checkInDate).getTime()) /
                            (24 * 60 * 60 * 1000)));
                        nightMajor = currency === "KWD" || currency === "BHD" || currency === "OMR"
                            ? 28 + (seed % 42)
                            : 280 + (seed % 420);
                        exp = currency === "KWD" || currency === "BHD" || currency === "OMR" ? 3 : 2;
                        baseNight = Math.round(nightMajor * Math.pow(10, exp));
                        hotels = [
                            {
                                name: "\u0641\u0646\u062F\u0642 ".concat((geo === null || geo === void 0 ? void 0 : geo.label) || params.location, " \u0633\u0646\u062A\u0631\u0627\u0644"),
                                stars: 4,
                                rating: 8.4,
                            },
                            {
                                name: "\u0645\u0646\u062A\u062C\u0639 ".concat((geo === null || geo === void 0 ? void 0 : geo.label) || params.location, " \u0628\u0644\u0627\u0632\u0627"),
                                stars: 5,
                                rating: 9.1,
                            },
                            {
                                name: "\u0625\u0642\u0627\u0645\u0629 ".concat((geo === null || geo === void 0 ? void 0 : geo.label) || params.location, " \u0628\u064A\u0632\u0646\u0633"),
                                stars: 3,
                                rating: 7.6,
                            },
                        ];
                        return [2 /*return*/, hotels.map(function (hotel, index) {
                                var cost = Math.round(baseNight * (1 + index * 0.22) * nights);
                                return {
                                    providerKey: _this.providerKey,
                                    providerOfferRef: "MOCK-HTL-".concat((seed + index).toString(16).toUpperCase()),
                                    description: "".concat(hotel.name, " \u00B7 ").concat(nights, " \u0644\u064A\u0644\u0629 \u00B7 ").concat(params.checkInDate, " \u2192 ").concat(params.checkOutDate),
                                    costAmountMinor: cost,
                                    currency: currency,
                                    revalidationToken: "htl_rv_".concat(seed + index),
                                    expiresAt: expiresAt,
                                    raw: {
                                        provider: "mock",
                                        liveMode: false,
                                        name: hotel.name,
                                        stars: hotel.stars,
                                        rating: hotel.rating,
                                        nights: nights,
                                        checkInDate: params.checkInDate,
                                        checkOutDate: params.checkOutDate,
                                        rooms: params.rooms || 1,
                                        adults: params.adults,
                                        location: (geo === null || geo === void 0 ? void 0 : geo.label) || params.location,
                                        latitude: geo === null || geo === void 0 ? void 0 : geo.latitude,
                                        longitude: geo === null || geo === void 0 ? void 0 : geo.longitude,
                                        board: index === 1 ? "إفطار" : "غرفة فقط",
                                    },
                                };
                            })];
                }
            });
        });
    };
    MockTravelProvider.prototype.revalidateOffer = function (offer) {
        return __awaiter(this, void 0, void 0, function () {
            var nudge, nextCost;
            return __generator(this, function (_a) {
                nudge = offer.providerOfferRef.endsWith("A") ? 1500 : 0;
                nextCost = offer.costAmountMinor + nudge;
                return [2 /*return*/, {
                        available: true,
                        priceChanged: nudge > 0,
                        previousCostMinor: offer.costAmountMinor,
                        offer: __assign(__assign({}, offer), { costAmountMinor: nextCost, expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString() }),
                    }];
            });
        });
    };
    MockTravelProvider.prototype.createBooking = function (offer) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        providerBookingRef: "PNR-MOCK-".concat(offer.providerOfferRef.slice(-6)),
                        status: "confirmed",
                    }];
            });
        });
    };
    return MockTravelProvider;
}());
exports.MockTravelProvider = MockTravelProvider;
