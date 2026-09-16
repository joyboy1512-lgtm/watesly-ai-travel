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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTravelCatalog = seedTravelCatalog;
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
var AIRPORTS_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat";
var AIRLINES_URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat";
function splitCsvLine(line) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i += 1) {
        var ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (ch === "," && !inQuotes) {
            out.push(cur);
            cur = "";
            continue;
        }
        cur += ch;
    }
    out.push(cur);
    return out;
}
function clean(value) {
    if (!value || value === "\\N")
        return null;
    return value.trim() || null;
}
function airlineLogo(iata) {
    if (!iata || iata.length !== 2)
        return null;
    return "https://pics.avs.io/120/40/".concat(iata.toUpperCase(), ".png");
}
function fetchText(url) {
    return __awaiter(this, void 0, void 0, function () {
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fetch(url)];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        throw new Error("Failed to fetch ".concat(url, ": ").concat(res.status));
                    return [2 /*return*/, res.text()];
            }
        });
    });
}
function seedTravelCatalog() {
    return __awaiter(this, arguments, void 0, function (client) {
        var _a, airportsRaw, airlinesRaw, airports, airlines, airportChunk, i, airlineChunk, i, _b, airportCount, airlineCount;
        if (client === void 0) { client = prisma; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("Seeding global airports & airlines from OpenFlights...");
                    return [4 /*yield*/, Promise.all([
                            fetchText(AIRPORTS_URL),
                            fetchText(AIRLINES_URL),
                        ])];
                case 1:
                    _a = _c.sent(), airportsRaw = _a[0], airlinesRaw = _a[1];
                    airports = airportsRaw
                        .split(/\r?\n/)
                        .map(function (line) { return line.trim(); })
                        .filter(Boolean)
                        .map(function (line) {
                        var _a, _b;
                        var cols = splitCsvLine(line);
                        var iata = ((_a = clean(cols[4])) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || null;
                        var icao = ((_b = clean(cols[5])) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || null;
                        if (!iata && !icao)
                            return null;
                        // Prefer rows with IATA for search UX; keep ICAO-only too with synthetic key later
                        return {
                            iataCode: iata && iata.length === 3 ? iata : null,
                            icaoCode: icao && icao.length === 4 ? icao : null,
                            name: clean(cols[1]) || "Airport",
                            city: clean(cols[2]),
                            country: clean(cols[3]),
                            latitude: cols[6] ? Number(cols[6]) : null,
                            longitude: cols[7] ? Number(cols[7]) : null,
                            timezone: clean(cols[11]),
                        };
                    })
                        .filter(function (row) { return Boolean(row === null || row === void 0 ? void 0 : row.name); })
                        .filter(function (row) { return Boolean(row.iataCode); });
                    airlines = airlinesRaw
                        .split(/\r?\n/)
                        .map(function (line) { return line.trim(); })
                        .filter(Boolean)
                        .map(function (line) {
                        var _a, _b;
                        var cols = splitCsvLine(line);
                        var iata = ((_a = clean(cols[3])) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || null;
                        var icao = ((_b = clean(cols[4])) === null || _b === void 0 ? void 0 : _b.toUpperCase()) || null;
                        var active = (clean(cols[7]) || "Y").toUpperCase() !== "N";
                        if (!iata || iata.length !== 2)
                            return null;
                        return {
                            iataCode: iata,
                            icaoCode: icao && icao.length === 3 ? icao : null,
                            name: clean(cols[1]) || iata,
                            alias: clean(cols[2]),
                            country: clean(cols[6]),
                            active: active,
                            logoUrl: airlineLogo(iata),
                        };
                    })
                        .filter(function (row) { return Boolean(row); });
                    // Clear & reload for idempotent full catalog refresh
                    return [4 /*yield*/, client.airport.deleteMany()];
                case 2:
                    // Clear & reload for idempotent full catalog refresh
                    _c.sent();
                    return [4 /*yield*/, client.airline.deleteMany()];
                case 3:
                    _c.sent();
                    airportChunk = 500;
                    i = 0;
                    _c.label = 4;
                case 4:
                    if (!(i < airports.length)) return [3 /*break*/, 7];
                    return [4 /*yield*/, client.airport.createMany({
                            data: airports.slice(i, i + airportChunk),
                            skipDuplicates: true,
                        })];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    i += airportChunk;
                    return [3 /*break*/, 4];
                case 7:
                    airlineChunk = 500;
                    i = 0;
                    _c.label = 8;
                case 8:
                    if (!(i < airlines.length)) return [3 /*break*/, 11];
                    return [4 /*yield*/, client.airline.createMany({
                            data: airlines.slice(i, i + airlineChunk),
                            skipDuplicates: true,
                        })];
                case 9:
                    _c.sent();
                    _c.label = 10;
                case 10:
                    i += airlineChunk;
                    return [3 /*break*/, 8];
                case 11: return [4 /*yield*/, Promise.all([
                        client.airport.count(),
                        client.airline.count(),
                    ])];
                case 12:
                    _b = _c.sent(), airportCount = _b[0], airlineCount = _b[1];
                    console.log("Travel catalog ready: ".concat(airportCount, " airports, ").concat(airlineCount, " airlines"));
                    return [2 /*return*/];
            }
        });
    });
}
var isDirectRun = (_a = process.argv[1]) === null || _a === void 0 ? void 0 : _a.includes("seed-travel-catalog");
if (isDirectRun) {
    seedTravelCatalog()
        .then(function () { return prisma.$disconnect(); })
        .catch(function (err) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.error(err);
                    return [4 /*yield*/, prisma.$disconnect()];
                case 1:
                    _a.sent();
                    process.exit(1);
                    return [2 /*return*/];
            }
        });
    }); });
}
