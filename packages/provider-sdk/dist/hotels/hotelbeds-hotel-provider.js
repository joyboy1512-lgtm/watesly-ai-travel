"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotelbedsHotelProvider = void 0;
const locations_1 = require("../locations");
const types_1 = require("../types");
const hotelbeds_auth_1 = require("./hotelbeds-auth");
const hotelbeds_content_client_1 = require("./hotelbeds-content-client");
const hotelbeds_mapper_1 = require("./hotelbeds-mapper");
const hotelbeds_rate_comments_1 = require("./hotelbeds-rate-comments");
const hotelbeds_types_1 = require("./hotelbeds-types");
const hotelbeds_currency_1 = require("./hotelbeds-currency");
const circuit_breaker_1 = require("../ops/circuit-breaker");
const errors_1 = require("../ops/errors");
const inflight_1 = require("../ops/inflight");
const provider_log_1 = require("../ops/provider-log");
const with_timeout_1 = require("../ops/with-timeout");
const SEARCH_CACHE_TTL_MS = 8 * 60 * 1000;
const SEARCH_STALE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 35_000;
const hotelbedsCircuit = new circuit_breaker_1.CircuitBreaker({
    name: "hotelbeds",
    failureThreshold: 5,
    resetMs: 60_000,
});
const hotelSearchCache = new Map();
function humanizeHotelbedsError(message) {
    const m = String(message || "").trim();
    if (/quota has been exceeded/i.test(m)) {
        return "تم تجاوز حد طلبات مزود الفنادق التجريبي مؤقتًا. أعد المحاولة بعد قليل.";
    }
    if (/too many requests|rate limit/i.test(m)) {
        return "طلبات كثيرة جدًا على مزود الفنادق. انتظر لحظات ثم أعد المحاولة.";
    }
    return m || "تعذر الاتصال بمزود الفنادق";
}
function isQuotaError(message) {
    return /quota has been exceeded|too many requests|rate limit/i.test(message);
}
function searchCacheKey(params) {
    return JSON.stringify({
        location: String(params.location || "").trim().toLowerCase(),
        hotelCode: String(params.hotelCode || "").trim(),
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        rooms: params.rooms || 1,
        adults: params.adults,
        children: params.children || 0,
        childrenAges: String(params.childrenAges || ""),
        roomOccupancies: params.roomOccupancies || null,
        currency: params.currency || "",
        maxHotels: params.maxHotels ?? 30,
        radiusKm: params.radiusKm || 25,
        boardCode: params.boardCode || "",
        paymentType: params.paymentType || "",
        minStars: params.minStars || null,
        maxStars: params.maxStars || null,
    });
}
function normalizeChildrenAges(children, raw) {
    const count = Math.max(0, children);
    if (count === 0)
        return [];
    const parsed = String(raw || "")
        .split(",")
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
    if (parsed.length < count) {
        throw new Error("يجب تحديد عمر كل طفل قبل البحث عن الفنادق");
    }
    return parsed.slice(0, count);
}
function firstHbRate(hotel) {
    for (const room of hotel?.rooms || []) {
        for (const rate of room.rates || []) {
            if (rate.rateKey)
                return rate;
        }
    }
    return undefined;
}
class HotelbedsHotelProvider {
    providerKey = "hotelbeds";
    displayName = "Hotelbeds Hotels";
    liveMode;
    creds;
    constructor(creds) {
        this.creds = (0, hotelbeds_auth_1.resolveHotelbedsCredentials)(creds);
        this.liveMode = Boolean(this.creds.apiKey && this.creds.apiSecret);
    }
    ensureConfigured() {
        if (!this.creds.apiKey || !this.creds.apiSecret) {
            throw new Error("مزود Hotelbeds غير مُعدّ. أدخل apiKey و apiSecret في /dashboard/providers أو HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET");
        }
    }
    async request(path, body, method = "POST") {
        this.ensureConfigured();
        if (!hotelbedsCircuit.allow()) {
            throw new Error("مزود الفنادق غير متاح مؤقتًا (CIRCUIT_OPEN). أعد المحاولة بعد قليل.");
        }
        const url = `${this.creds.baseUrl}${path}`;
        const { signal, clear } = (0, with_timeout_1.withTimeoutSignal)(REQUEST_TIMEOUT_MS);
        const started = Date.now();
        const requestId = (0, provider_log_1.newRequestId)();
        try {
            const response = await fetch(url, {
                method,
                headers: (0, hotelbeds_auth_1.hotelbedsHeaders)(this.creds),
                ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
                signal,
            });
            const json = (await response.json().catch(() => ({})));
            if (!response.ok) {
                const err = json;
                throw new Error(humanizeHotelbedsError(err.error?.message ||
                    err.message ||
                    `Hotelbeds HTTP ${response.status}`));
            }
            hotelbedsCircuit.recordSuccess();
            (0, provider_log_1.logProviderOps)({
                requestId,
                provider: "hotelbeds",
                operation: path,
                durationMs: Date.now() - started,
                status: "ok",
            });
            return json;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            hotelbedsCircuit.recordFailure();
            (0, provider_log_1.logProviderOps)({
                requestId,
                provider: "hotelbeds",
                operation: path,
                durationMs: Date.now() - started,
                status: /timeout|abort/i.test(msg) ? "timeout" : "error",
                errorCode: (0, errors_1.providerErrorCode)(error),
            });
            throw error instanceof Error ? error : new Error(humanizeHotelbedsError(msg));
        }
        finally {
            clear();
        }
    }
    async pingStatus() {
        try {
            this.ensureConfigured();
            const res = await fetch(`${this.creds.baseUrl}/hotel-api/1.0/status`, {
                headers: (0, hotelbeds_auth_1.hotelbedsHeaders)(this.creds),
            });
            const json = (await res.json().catch(() => ({})));
            if (!res.ok) {
                return {
                    ok: false,
                    message: json.error?.message || `HTTP ${res.status}`,
                };
            }
            return {
                ok: true,
                message: json.status || "Hotelbeds sandbox متصل",
            };
        }
        catch (error) {
            return {
                ok: false,
                message: error instanceof Error ? error.message : "فشل الاتصال",
            };
        }
    }
    async searchHotels(params) {
        const cacheKey = searchCacheKey(params);
        return (0, inflight_1.singleflight)(`hb-search:${cacheKey}`, () => this.searchHotelsInner(params, cacheKey));
    }
    async searchHotelsInner(params, cacheKey) {
        const cached = hotelSearchCache.get(cacheKey);
        const cacheAge = cached ? Date.now() - cached.savedAt : Number.POSITIVE_INFINITY;
        if (cached && cacheAge < SEARCH_CACHE_TTL_MS) {
            (0, provider_log_1.logProviderOps)({
                provider: "hotelbeds",
                operation: "searchHotels",
                durationMs: 0,
                status: "cache_hit",
            });
            return cached.offers.map((offer) => ({ ...offer }));
        }
        const hotelCodeRaw = String(params.hotelCode || "").trim();
        const hotelCodeNum = hotelCodeRaw
            ? Number(hotelCodeRaw.replace(/^hb-/i, ""))
            : NaN;
        const singleHotel = Number.isFinite(hotelCodeNum) && hotelCodeNum > 0 ? hotelCodeNum : undefined;
        const geo = await (0, locations_1.geocodeLocation)(params.location);
        if (!geo && !singleHotel) {
            throw new Error(`تعذر تحديد موقع «${params.location}» لبحث Hotelbeds. استخدم مدينة معروفة مثل دبي أو الكويت.`);
        }
        const rooms = Math.max(1, params.rooms || 1);
        const children = Math.max(0, params.children || 0);
        const ages = normalizeChildrenAges(children, params.childrenAges);
        const currency = (0, hotelbeds_currency_1.hotelbedsDisplayCurrency)(params.currency);
        const sourceMarket = (0, hotelbeds_currency_1.hotelbedsSourceMarket)(currency);
        const shiftDays = Math.max(0, Math.min(5, Number(params.shiftDays || 0) || 0));
        const filter = {
            maxHotels: singleHotel ? 1 : (params.maxHotels ?? 30),
            maxRooms: params.maxRoomsPerHotel ?? (singleHotel ? 50 : 25),
        };
        if (params.minStars) {
            filter.minCategory = String(params.minStars);
            filter.maxCategory = "5EST";
        }
        if (params.maxStars)
            filter.maxCategory = `${params.maxStars}EST`;
        if (params.minRate && params.minRate > 0)
            filter.minRate = String(params.minRate);
        if (params.maxRate && params.maxRate > 0)
            filter.maxRate = String(params.maxRate);
        if (params.paymentType === "AT_HOTEL" || params.paymentType === "AT_WEB") {
            filter.paymentType = params.paymentType;
        }
        const roomOccupancies = Array.isArray(params.roomOccupancies)
            ? params.roomOccupancies.filter((r) => r && Math.max(1, r.adults || 0) >= 1)
            : [];
        let occupancies;
        if (roomOccupancies.length > 0) {
            occupancies = roomOccupancies.map((room) => {
                const adults = Math.max(1, room.adults || 1);
                const childAges = (room.childrenAges || [])
                    .map((a) => Number(a))
                    .filter((a) => Number.isFinite(a) && a >= 0 && a <= 17);
                const childCount = Math.max(0, room.children != null ? Number(room.children) : childAges.length);
                if (childCount > 0 && childAges.length < childCount) {
                    throw new Error("يجب تحديد عمر كل طفل في كل غرفة قبل البحث");
                }
                const agesForRoom = childAges.slice(0, childCount);
                return {
                    rooms: 1,
                    adults,
                    children: agesForRoom.length,
                    ...(agesForRoom.length
                        ? { paxes: agesForRoom.map((age) => ({ type: "CH", age })) }
                        : {}),
                };
            });
        }
        else {
            occupancies = [
                {
                    rooms,
                    adults: Math.max(1, params.adults),
                    children,
                    ...(children > 0
                        ? { paxes: ages.map((age) => ({ type: "CH", age })) }
                        : {}),
                },
            ];
        }
        const payload = {
            stay: {
                checkIn: params.checkInDate,
                checkOut: params.checkOutDate,
                ...(shiftDays > 0 ? { shiftDays } : {}),
            },
            occupancies,
            filter,
            language: "ENG",
            sourceMarket,
            dailyRate: true,
        };
        if (singleHotel) {
            payload.hotels = { hotel: [singleHotel] };
        }
        else if (geo) {
            payload.geolocation = {
                latitude: geo.latitude,
                longitude: geo.longitude,
                radius: params.radiusKm || 25,
                unit: "km",
            };
        }
        if (params.boardCode) {
            payload.boards = { included: true, board: [params.boardCode] };
        }
        const destinationCode = params.location.trim().toUpperCase();
        if (!singleHotel && /^[A-Z]{3}$/.test(destinationCode)) {
            payload.destination = { code: destinationCode };
            delete payload.geolocation;
        }
        const availStarted = Date.now();
        let result;
        try {
            result = await this.request("/hotel-api/1.0/hotels", payload);
            console.info(`[hotelbeds-availability] ok hotels=${(0, hotelbeds_types_1.hotelsFromHotelbedsPayload)(result).length} ms=${Date.now() - availStarted}`);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[hotelbeds-availability] fail ms=${Date.now() - availStarted}`, msg);
            if (isQuotaError(msg) && cached && cacheAge < SEARCH_STALE_TTL_MS) {
                console.info(`[hotelbeds-availability] stale-cache after quota ageMs=${Math.round(cacheAge)} hotels=${cached.offers.length}`);
                return cached.offers.map((offer) => ({
                    ...offer,
                }));
            }
            // One retry on timeout/network only — never retry quota/auth
            if ((0, errors_1.isTransientProviderError)(err) && !isQuotaError(msg)) {
                const retryStarted = Date.now();
                result = await this.request("/hotel-api/1.0/hotels", payload);
                (0, provider_log_1.logProviderOps)({
                    provider: "hotelbeds",
                    operation: "searchHotels.retry",
                    durationMs: Date.now() - retryStarted,
                    status: "ok",
                    retryCount: 1,
                });
            }
            else {
                throw err instanceof Error ? err : new Error(humanizeHotelbedsError(msg));
            }
        }
        const hotels = (0, hotelbeds_types_1.hotelsFromHotelbedsPayload)(result);
        const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();
        const codes = hotels
            .map((h) => Number(h.code))
            .filter((c) => Number.isFinite(c) && c > 0);
        const [contentMap, facilityCatalog] = await Promise.all([
            (0, hotelbeds_content_client_1.fetchHotelbedsContentMap)(this.creds, codes),
            (0, hotelbeds_content_client_1.fetchHotelbedsFacilityCatalog)(this.creds),
        ]);
        const offers = [];
        for (const hotel of hotels) {
            const content = contentMap.get(Number(hotel.code));
            const offer = (0, hotelbeds_mapper_1.mapHotelbedsToOffer)({
                hotel,
                params: { ...params, currency },
                geoLabel: geo?.label || params.location,
                liveMode: this.liveMode,
                expiresAt,
                content,
                facilityCatalog,
                searchCenter: geo
                    ? {
                        latitude: geo.latitude,
                        longitude: geo.longitude,
                        label: geo.label,
                    }
                    : undefined,
            });
            if (offer)
                offers.push(offer);
        }
        const sorted = offers.sort((a, b) => a.costAmountMinor - b.costAmountMinor);
        hotelSearchCache.set(cacheKey, { offers: sorted, savedAt: Date.now() });
        // Bound memory: drop oldest when oversized
        if (hotelSearchCache.size > 40) {
            const oldest = [...hotelSearchCache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)[0];
            if (oldest)
                hotelSearchCache.delete(oldest[0]);
        }
        return sorted;
    }
    async fetchRateComments(ids, date) {
        this.ensureConfigured();
        return (0, hotelbeds_rate_comments_1.fetchHotelbedsRateComments)(this.creds, ids, date);
    }
    async revalidateOffer(offer) {
        let token = {};
        try {
            token = JSON.parse(offer.revalidationToken || "{}");
        }
        catch {
            token = { rateKey: offer.providerOfferRef };
        }
        let rateKey = token.rateKey || offer.providerOfferRef;
        if (!rateKey || rateKey.startsWith("hb-")) {
            const options = offer.raw?.rateOptions ||
                [];
            const first = options[0];
            if (!first?.rateKey) {
                return {
                    available: false,
                    priceChanged: false,
                    previousCostMinor: offer.costAmountMinor,
                    offer,
                };
            }
            rateKey = first.rateKey;
            token.rateKey = first.rateKey;
            token.rateType = first.rateType;
        }
        const previousRate = (0, hotelbeds_mapper_1.findMappedRate)(offer, rateKey);
        const previousNet = previousRate?.net;
        const previousCostMinor = previousNet
            ? (0, types_1.amountToMinor)(previousNet, offer.currency)
            : offer.costAmountMinor;
        const checked = await this.request("/hotel-api/1.0/checkrates", { rooms: [{ rateKey }], language: "ENG" });
        const hotel = (0, hotelbeds_types_1.hotelsFromHotelbedsPayload)(checked)[0];
        if (!hotel) {
            return {
                available: false,
                priceChanged: false,
                previousCostMinor,
                offer,
            };
        }
        const nextOffer = (0, hotelbeds_mapper_1.mapCheckratesToOffer)(offer, hotel, rateKey);
        const selectedRate = (0, hotelbeds_mapper_1.findMappedRate)(nextOffer, rateKey);
        const hbRate = firstHbRate(hotel);
        let rateComments = selectedRate?.rateComments ||
            (0, hotelbeds_rate_comments_1.rateCommentsFromHb)(hbRate?.rateComments);
        if (!rateComments && (selectedRate?.rateCommentsId || hbRate?.rateCommentsId)) {
            const date = String(nextOffer.raw?.checkInDate || hotel.checkIn || "");
            const comments = await this.fetchRateComments([String(selectedRate?.rateCommentsId || hbRate?.rateCommentsId)], date);
            rateComments = Object.values(comments)[0];
            if (rateComments && selectedRate) {
                selectedRate.rateComments = rateComments;
            }
        }
        const nextNet = selectedRate?.net;
        const nextCost = nextNet
            ? (0, types_1.amountToMinor)(nextNet, offer.currency)
            : nextOffer.costAmountMinor;
        const priceChanged = nextCost !== previousCostMinor;
        return {
            available: true,
            priceChanged,
            previousCostMinor,
            offer: nextOffer,
            selectedRate: selectedRate,
            rateComments,
        };
    }
    async createBooking(_offer, _guests) {
        throw new Error("حجز Hotelbeds الحي غير مفعّل بعد في WeekendGate — البحث وإعادة التحقق من السعر يعملان عبر Sandbox");
    }
}
exports.HotelbedsHotelProvider = HotelbedsHotelProvider;
//# sourceMappingURL=hotelbeds-hotel-provider.js.map