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
exports.parseMrzText = exports.extractPassportFromImage = exports.MockAiProvider = void 0;
exports.createAiProvider = createAiProvider;
var shared_1 = require("@watesly-travel/shared");
var CITY_ALIASES = {
    الرياض: "RUH",
    جدة: "JED",
    دبي: "DXB",
    القاهرة: "CAI",
    الدوحة: "DOH",
    الدمام: "DMM",
    دمام: "DMM",
    الكويت: "KWI",
    عمان: "AMM",
    بيروت: "BEY",
    اسطنبول: "IST",
    إسطنبول: "IST",
    لندن: "LHR",
    باريس: "CDG",
    ruh: "RUH",
    jed: "JED",
    dxb: "DXB",
    cai: "CAI",
    dmm: "DMM",
};
function normalizeCity(value) {
    if (!value)
        return undefined;
    var trimmed = value.trim();
    var lower = trimmed.toLowerCase();
    return CITY_ALIASES[trimmed] || CITY_ALIASES[lower] || trimmed.toUpperCase();
}
function parseDateToken(text) {
    var iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso === null || iso === void 0 ? void 0 : iso[1])
        return iso[1];
    var dmy = text.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
    if (dmy) {
        var day = dmy[1].padStart(2, "0");
        var month = dmy[2].padStart(2, "0");
        return "".concat(dmy[3], "-").concat(month, "-").concat(day);
    }
    return undefined;
}
function computeMissing(fields) {
    var missing = [];
    for (var _i = 0, INQUIRY_REQUIRED_FIELDS_1 = shared_1.INQUIRY_REQUIRED_FIELDS; _i < INQUIRY_REQUIRED_FIELDS_1.length; _i++) {
        var key = INQUIRY_REQUIRED_FIELDS_1[_i];
        var value = fields[key];
        if (value === undefined || value === null || value === "") {
            missing.push(key);
        }
    }
    return missing;
}
function nextQuestionFor(missing) {
    var _a;
    var map = {
        origin: "من أي مدينة أو مطار ترغب بالمغادرة؟",
        destination: "ما هي الوجهة المطلوبة؟",
        departDate: "ما هو تاريخ المغادرة؟ (مثال: 2026-09-15)",
        adults: "كم عدد البالغين؟",
    };
    return missing.length ? (_a = map[missing[0]]) !== null && _a !== void 0 ? _a : "هل يمكنك توضيح تفاصيل الرحلة؟" : null;
}
/**
 * Mock AI extractor — rule-based Arabic/English parsing.
 * Never returns prices or availability.
 */
var MockAiProvider = /** @class */ (function () {
    function MockAiProvider() {
        this.name = "mock";
    }
    MockAiProvider.prototype.extractTravelIntent = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var text, lower, fields, routeMatch, fromMatch, toMatch, pair, found, _i, _a, alias, code, date, returnHint, adultsMatch, childrenMatch, budgetMatch, missingFields, readyToSearch, summary;
            var _b, _c, _d;
            return __generator(this, function (_e) {
                text = input.messageText.trim();
                lower = text.toLowerCase();
                fields = __assign({}, ((_b = input.current) !== null && _b !== void 0 ? _b : {}));
                routeMatch = text.match(/من\s+([A-Za-z\u0600-\u06FF]+)\s+(?:إلى|الى|إلي)\s+([A-Za-z\u0600-\u06FF]+)/i);
                if (routeMatch) {
                    fields.origin = normalizeCity(routeMatch[1]);
                    fields.destination = normalizeCity(routeMatch[2]);
                }
                fromMatch = text.match(/(?:من مدينة|مغادرة|from)\s+([A-Za-z\u0600-\u06FF]+)/i);
                toMatch = text.match(/(?:إلى|الى|إلي|destination|to)\s+([A-Za-z\u0600-\u06FF]+)/i);
                if (!fields.origin && (fromMatch === null || fromMatch === void 0 ? void 0 : fromMatch[1]))
                    fields.origin = normalizeCity(fromMatch[1]);
                if (!fields.destination && (toMatch === null || toMatch === void 0 ? void 0 : toMatch[1])) {
                    fields.destination = normalizeCity(toMatch[1]);
                }
                // Pattern: "RUH DXB" / "رياض دبي"
                if (!fields.origin || !fields.destination) {
                    pair = text.match(/([A-Za-z\u0600-\u06FF]{2,})\s+(?:إلى|الى|إلي|to|-|–)\s+([A-Za-z\u0600-\u06FF]{2,})/i);
                    if (pair) {
                        fields.origin = fields.origin || normalizeCity(pair[1]);
                        fields.destination = fields.destination || normalizeCity(pair[2]);
                    }
                }
                // Fallback: known city names appearing in text
                if (!fields.origin || !fields.destination) {
                    found = [];
                    for (_i = 0, _a = Object.keys(CITY_ALIASES); _i < _a.length; _i++) {
                        alias = _a[_i];
                        if (alias.length < 2)
                            continue;
                        if (text.includes(alias) || lower.includes(alias.toLowerCase())) {
                            code = CITY_ALIASES[alias];
                            if (!found.includes(code))
                                found.push(code);
                        }
                    }
                    if (!fields.origin && found[0])
                        fields.origin = found[0];
                    if (!fields.destination && found[1])
                        fields.destination = found[1];
                }
                date = parseDateToken(text);
                if (date)
                    fields.departDate = date;
                returnHint = text.match(/(?:عودة|رجوع|return)\s*(?:في|:)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/i);
                if (returnHint === null || returnHint === void 0 ? void 0 : returnHint[1]) {
                    fields.returnDate = parseDateToken(returnHint[1]) || returnHint[1];
                }
                adultsMatch = text.match(/(?:بالغ|بالغين|adults?)\s*[:=]?\s*(\d+)/i);
                if (adultsMatch === null || adultsMatch === void 0 ? void 0 : adultsMatch[1])
                    fields.adults = Number(adultsMatch[1]);
                if (text.includes("شخصين") || text.includes("اثنين") || text.includes("ثنين")) {
                    fields.adults = 2;
                }
                if (text.includes("ثلاثة") || text.includes("3 أشخاص")) {
                    fields.adults = 3;
                }
                childrenMatch = text.match(/(?:طفل|أطفال|children)\s*[:=]?\s*(\d+)/i);
                if (childrenMatch === null || childrenMatch === void 0 ? void 0 : childrenMatch[1])
                    fields.children = Number(childrenMatch[1]);
                if (/(اقتصادي|economy)/i.test(text))
                    fields.cabinClass = "economy";
                if (/(رجال أعمال|business)/i.test(text))
                    fields.cabinClass = "business";
                if (/(أولى|first)/i.test(text))
                    fields.cabinClass = "first";
                budgetMatch = text.match(/(?:ميزانية|budget)\s*[:=]?\s*(\d+)/i);
                if (budgetMatch === null || budgetMatch === void 0 ? void 0 : budgetMatch[1]) {
                    fields.budgetAmount = Number(budgetMatch[1]) * 100; // assume major units → minor
                    fields.budgetCurrency = "KWD";
                }
                if (!fields.adults)
                    fields.adults = 1;
                fields.serviceTypes = (_c = fields.serviceTypes) !== null && _c !== void 0 ? _c : ["flight"];
                // If user replies with a bare city while a field is missing
                if ((!fields.origin || !fields.destination) &&
                    (CITY_ALIASES[text] || CITY_ALIASES[lower])) {
                    if (!fields.origin)
                        fields.origin = normalizeCity(text);
                    else if (!fields.destination)
                        fields.destination = normalizeCity(text);
                }
                missingFields = computeMissing(fields);
                readyToSearch = missingFields.length === 0;
                summary = [
                    fields.origin && "\u0645\u063A\u0627\u062F\u0631\u0629: ".concat(fields.origin),
                    fields.destination && "\u0648\u062C\u0647\u0629: ".concat(fields.destination),
                    fields.departDate && "\u0630\u0647\u0627\u0628: ".concat(fields.departDate),
                    fields.returnDate && "\u0639\u0648\u062F\u0629: ".concat(fields.returnDate),
                    "\u0628\u0627\u0644\u063A\u0648\u0646: ".concat((_d = fields.adults) !== null && _d !== void 0 ? _d : 1),
                    fields.cabinClass && "\u062F\u0631\u062C\u0629: ".concat(fields.cabinClass),
                ]
                    .filter(Boolean)
                    .join(" · ");
                return [2 /*return*/, {
                        fields: fields,
                        missingFields: missingFields,
                        nextQuestion: nextQuestionFor(missingFields),
                        readyToSearch: readyToSearch,
                        summary: summary || "استعلام سفر قيد الاستكمال",
                        prices: [],
                        provider: this.name,
                        model: "mock-rules-v1",
                    }];
            });
        });
    };
    return MockAiProvider;
}());
exports.MockAiProvider = MockAiProvider;
function createAiProvider(provider) {
    if (provider === void 0) { provider = process.env.AI_PROVIDER || "mock"; }
    if (provider === "mock" || !process.env.OPENAI_API_KEY) {
        return new MockAiProvider();
    }
    // OpenAI adapter placeholder — falls back to mock until key/integration is ready
    return new MockAiProvider();
}
var passport_1 = require("./passport");
Object.defineProperty(exports, "extractPassportFromImage", { enumerable: true, get: function () { return passport_1.extractPassportFromImage; } });
Object.defineProperty(exports, "parseMrzText", { enumerable: true, get: function () { return passport_1.parseMrzText; } });
