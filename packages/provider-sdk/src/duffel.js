"use strict";
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
exports.DuffelTravelProvider = void 0;
var locations_1 = require("./locations");
var types_1 = require("./types");
function cabinToDuffel(cabin) {
    var c = (cabin || "economy").toLowerCase();
    if (c.includes("first"))
        return "first";
    if (c.includes("business"))
        return "business";
    if (c.includes("premium"))
        return "premium_economy";
    return "economy";
}
function buildPassengers(params) {
    var passengers = [];
    for (var i = 0; i < Math.max(1, params.adults); i += 1) {
        passengers.push({ type: "adult" });
    }
    for (var i = 0; i < (params.children || 0); i += 1) {
        passengers.push({ type: "child" });
    }
    for (var i = 0; i < (params.infants || 0); i += 1) {
        passengers.push({ type: "infant_without_seat" });
    }
    return passengers;
}
function formatDuration(iso) {
    if (!iso)
        return "";
    var match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
    if (!match)
        return iso;
    var h = match[1] ? "".concat(match[1], "\u0633") : "";
    var m = match[2] ? "".concat(match[2], "\u062F") : "";
    return [h, m].filter(Boolean).join(" ") || iso;
}
function mapFlightOffer(offer, liveMode) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    var slice = (_a = offer.slices) === null || _a === void 0 ? void 0 : _a[0];
    var segments = (slice === null || slice === void 0 ? void 0 : slice.segments) || [];
    var first = segments[0];
    var last = segments[segments.length - 1];
    var airline = ((_b = offer.owner) === null || _b === void 0 ? void 0 : _b.name) ||
        ((_c = first === null || first === void 0 ? void 0 : first.operating_carrier) === null || _c === void 0 ? void 0 : _c.name) ||
        ((_d = first === null || first === void 0 ? void 0 : first.marketing_carrier) === null || _d === void 0 ? void 0 : _d.name) ||
        "Airline";
    var airlineCode = ((_e = offer.owner) === null || _e === void 0 ? void 0 : _e.iata_code) ||
        ((_f = first === null || first === void 0 ? void 0 : first.operating_carrier) === null || _f === void 0 ? void 0 : _f.iata_code) ||
        ((_g = first === null || first === void 0 ? void 0 : first.marketing_carrier) === null || _g === void 0 ? void 0 : _g.iata_code) ||
        "";
    var from = (first === null || first === void 0 ? void 0 : first.originating_airport_iata_code) || "?";
    var to = (last === null || last === void 0 ? void 0 : last.destination_airport_iata_code) || "?";
    var departAt = ((_h = first === null || first === void 0 ? void 0 : first.departing_at) === null || _h === void 0 ? void 0 : _h.slice(0, 16).replace("T", " ")) || "";
    var arriveAt = ((_j = last === null || last === void 0 ? void 0 : last.arriving_at) === null || _j === void 0 ? void 0 : _j.slice(0, 16).replace("T", " ")) || "";
    var stops = Math.max(0, segments.length - 1);
    var duration = formatDuration(slice === null || slice === void 0 ? void 0 : slice.duration);
    var currency = offer.total_currency || "USD";
    return {
        providerKey: "duffel",
        providerOfferRef: offer.id,
        description: "".concat(airline, " ").concat(from, " \u2192 ").concat(to, " \u00B7 ").concat(departAt).concat(duration ? " \u00B7 ".concat(duration) : "").concat(stops ? " \u00B7 ".concat(stops, " \u062A\u0648\u0642\u0641") : " · مباشر"),
        costAmountMinor: (0, types_1.amountToMinor)(offer.total_amount, currency),
        currency: currency,
        revalidationToken: offer.id,
        expiresAt: offer.expires_at ||
            new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        raw: {
            provider: "duffel",
            liveMode: liveMode,
            airline: airline,
            airlineCode: airlineCode,
            cabin: offer.cabin_class || "economy",
            duration: duration,
            stops: stops,
            departAt: departAt,
            arriveAt: arriveAt,
            from: from,
            to: to,
            segments: segments.map(function (s) {
                var _a, _b;
                return ({
                    from: s.originating_airport_iata_code,
                    to: s.destination_airport_iata_code,
                    departAt: s.departing_at,
                    arriveAt: s.arriving_at,
                    airline: ((_a = s.operating_carrier) === null || _a === void 0 ? void 0 : _a.name) || ((_b = s.marketing_carrier) === null || _b === void 0 ? void 0 : _b.name) || airline,
                    flightNumber: s.marketing_carrier_flight_number,
                });
            }),
            totalAmount: offer.total_amount,
            totalCurrency: offer.total_currency,
        },
    };
}
function mapHotelOffer(result, liveMode, nights) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    var amount = result.cheapest_rate_total_amount;
    var currency = result.cheapest_rate_currency || "USD";
    if (!amount || !result.id)
        return null;
    var name = ((_a = result.accommodation) === null || _a === void 0 ? void 0 : _a.name) || "إقامة";
    var stars = (_b = result.accommodation) === null || _b === void 0 ? void 0 : _b.rating;
    var rating = (_c = result.accommodation) === null || _c === void 0 ? void 0 : _c.review_score;
    var city = (_f = (_e = (_d = result.accommodation) === null || _d === void 0 ? void 0 : _d.location) === null || _e === void 0 ? void 0 : _e.address) === null || _f === void 0 ? void 0 : _f.city_name;
    return {
        providerKey: "duffel",
        providerOfferRef: result.id,
        description: "".concat(name).concat(city ? " \u00B7 ".concat(city) : "", " \u00B7 ").concat(nights, " \u0644\u064A\u0644\u0629"),
        costAmountMinor: (0, types_1.amountToMinor)(amount, currency),
        currency: currency,
        revalidationToken: result.id,
        expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        raw: {
            provider: "duffel",
            liveMode: liveMode,
            name: name,
            stars: stars,
            rating: rating,
            nights: nights,
            city: city,
            latitude: (_j = (_h = (_g = result.accommodation) === null || _g === void 0 ? void 0 : _g.location) === null || _h === void 0 ? void 0 : _h.geographic_coordinates) === null || _j === void 0 ? void 0 : _j.latitude,
            longitude: (_m = (_l = (_k = result.accommodation) === null || _k === void 0 ? void 0 : _k.location) === null || _l === void 0 ? void 0 : _l.geographic_coordinates) === null || _m === void 0 ? void 0 : _m.longitude,
            totalAmount: amount,
            totalCurrency: currency,
            description: (_o = result.accommodation) === null || _o === void 0 ? void 0 : _o.description,
        },
    };
}
var DuffelTravelProvider = /** @class */ (function () {
    function DuffelTravelProvider(token) {
        if (token === void 0) { token = process.env.DUFFEL_ACCESS_TOKEN || ""; }
        this.providerKey = "duffel";
        this.displayName = "Duffel";
        if (!token.trim()) {
            throw new Error("مزود Duffel غير مضبوط. أضف DUFFEL_ACCESS_TOKEN في ملف .env (توكن اختبار يبدأ بـ duffel_test_)");
        }
        this.token = token.trim();
        this.version = process.env.DUFFEL_VERSION || "v2";
        this.baseUrl = process.env.DUFFEL_BASE_URL || "https://api.duffel.com";
        this.liveMode = this.token.startsWith("duffel_live_");
    }
    DuffelTravelProvider.prototype.request = function (method, path, body) {
        return __awaiter(this, void 0, void 0, function () {
            var res, json, msg;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, fetch("".concat(this.baseUrl).concat(path), {
                            method: method,
                            headers: {
                                Accept: "application/json",
                                "Content-Type": "application/json",
                                "Duffel-Version": this.version,
                                Authorization: "Bearer ".concat(this.token),
                                "Accept-Encoding": "gzip",
                            },
                            body: body ? JSON.stringify(body) : undefined,
                        })];
                    case 1:
                        res = _b.sent();
                        return [4 /*yield*/, res.json().catch(function () { return ({}); })];
                    case 2:
                        json = (_b.sent());
                        if (!res.ok) {
                            msg = ((_a = json.errors) === null || _a === void 0 ? void 0 : _a.map(function (e) { return e.message || e.title; }).filter(Boolean).join(" · ")) ||
                                "Duffel HTTP ".concat(res.status);
                            throw new Error(msg);
                        }
                        return [2 /*return*/, json.data];
                }
            });
        });
    };
    DuffelTravelProvider.prototype.searchFlights = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var slices, data, offers;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        slices = [
                            {
                                origin: params.origin.trim().toUpperCase(),
                                destination: params.destination.trim().toUpperCase(),
                                departure_date: params.departDate,
                            },
                        ];
                        if (params.returnDate) {
                            slices.push({
                                origin: params.destination.trim().toUpperCase(),
                                destination: params.origin.trim().toUpperCase(),
                                departure_date: params.returnDate,
                            });
                        }
                        return [4 /*yield*/, this.request("POST", "/air/offer_requests?return_offers=true", {
                                data: {
                                    slices: slices,
                                    passengers: buildPassengers(params),
                                    cabin_class: cabinToDuffel(params.cabinClass),
                                },
                            })];
                    case 1:
                        data = _a.sent();
                        offers = (data.offers || [])
                            .slice(0, 12)
                            .map(function (offer) { return mapFlightOffer(offer, _this.liveMode); })
                            .sort(function (a, b) { return a.costAmountMinor - b.costAmountMinor; });
                        if (!offers.length) {
                            throw new Error("لم تُرجع Duffel أي رحلات لهذا البحث");
                        }
                        return [2 /*return*/, offers];
                }
            });
        });
    };
    DuffelTravelProvider.prototype.searchHotels = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var geo, nights, guests, results, offers;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, locations_1.geocodeLocation)(params.location)];
                    case 1:
                        geo = _a.sent();
                        if (!geo) {
                            throw new Error("\u062A\u0639\u0630\u0631 \u062A\u062D\u062F\u064A\u062F \u0645\u0648\u0642\u0639 \u0627\u0644\u0641\u0646\u0627\u062F\u0642 \u0644\u0640 \"".concat(params.location, "\". \u062C\u0631\u0651\u0628 \u0631\u0645\u0632 \u0645\u062F\u064A\u0646\u0629 \u0645\u062B\u0644 DXB \u0623\u0648 \u0627\u0633\u0645 \u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0636\u062D."));
                        }
                        nights = Math.max(1, Math.round((new Date(params.checkOutDate).getTime() -
                            new Date(params.checkInDate).getTime()) /
                            (24 * 60 * 60 * 1000)));
                        guests = Array.from({ length: Math.max(1, params.adults) }, function () { return ({
                            type: "adult",
                        }); });
                        return [4 /*yield*/, this.request("POST", "/stays/search", {
                                data: {
                                    check_in_date: params.checkInDate,
                                    check_out_date: params.checkOutDate,
                                    rooms: Math.max(1, params.rooms || 1),
                                    guests: guests,
                                    location: {
                                        radius: params.radiusKm || 8,
                                        geographic_coordinates: {
                                            latitude: geo.latitude,
                                            longitude: geo.longitude,
                                        },
                                    },
                                },
                            })];
                    case 2:
                        results = _a.sent();
                        offers = (Array.isArray(results) ? results : [])
                            .map(function (row) { return mapHotelOffer(row, _this.liveMode, nights); })
                            .filter(function (x) { return Boolean(x); })
                            .slice(0, 12)
                            .sort(function (a, b) { return a.costAmountMinor - b.costAmountMinor; });
                        if (!offers.length) {
                            throw new Error("لم تُرجع Duffel أي فنادق لهذا البحث");
                        }
                        return [2 /*return*/, offers];
                }
            });
        });
    };
    DuffelTravelProvider.prototype.revalidateOffer = function (offer) {
        return __awaiter(this, void 0, void 0, function () {
            var fresh, mapped;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!offer.providerOfferRef.startsWith("off_")) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.request("GET", "/air/offers/".concat(offer.providerOfferRef))];
                    case 1:
                        fresh = _a.sent();
                        mapped = mapFlightOffer(fresh, this.liveMode);
                        return [2 /*return*/, {
                                available: true,
                                priceChanged: mapped.costAmountMinor !== offer.costAmountMinor,
                                previousCostMinor: offer.costAmountMinor,
                                offer: mapped,
                            }];
                    case 2: return [2 /*return*/, {
                            available: true,
                            priceChanged: false,
                            offer: offer,
                        }];
                }
            });
        });
    };
    return DuffelTravelProvider;
}());
exports.DuffelTravelProvider = DuffelTravelProvider;
