"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HotelbedsTransferProvider = void 0;
exports.resolveTransferEndpoint = resolveTransferEndpoint;
exports.ensureDistinctTransferEndpoints = ensureDistinctTransferEndpoints;
exports.resolveTransferEndpointLegacy = resolveTransferEndpointLegacy;
const shared_1 = require("@watesly-travel/shared");
const locations_1 = require("../locations");
const types_1 = require("../types");
const hotelbeds_currency_1 = require("../hotels/hotelbeds-currency");
const hotelbeds_auth_1 = require("../hotels/hotelbeds-auth");
function textOf(value) {
    if (!value)
        return "";
    if (typeof value === "string")
        return value.trim();
    return String(value.content || "").trim();
}
function normalizeTime(raw) {
    const t = String(raw || "10:00").trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(t))
        return t.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(t))
        return t;
    return "10:00";
}
function datetimeStamp(date, time) {
    return `${date}T${normalizeTime(time)}:00`;
}
function encodeSegment(value) {
    return encodeURIComponent(value);
}
async function resolveTransferEndpoint(input) {
    const raw = input.query.trim();
    const city = input.city?.trim() || "";
    const kind = input.kind;
    if (kind === "IATA") {
        const code = raw.toUpperCase();
        if (/^[A-Z]{3}$/.test(code)) {
            return { type: "IATA", code, label: code };
        }
        const fromCity = (0, locations_1.cityDefaultAirport)(city || raw);
        if (fromCity) {
            return { type: "IATA", code: fromCity, label: fromCity };
        }
        throw new Error("حدد مطاراً برمز IATA (مثل KWI) أو اختر مدينة لها مطار معروف");
    }
    if (kind === "ATLAS") {
        const code = raw.replace(/^hb-/i, "");
        if (/^\d+$/.test(code)) {
            return { type: "ATLAS", code, label: raw || code };
        }
        throw new Error("اختر فندقاً محدداً من قائمة الفنادق");
    }
    const geoQuery = raw && city ? `${raw}, ${city}` : raw || city;
    if (!geoQuery) {
        throw new Error("حدد العنوان أو الحي");
    }
    const known = (0, locations_1.resolveGeoLocation)(geoQuery) || (0, locations_1.resolveGeoLocation)(city);
    const geo = known || (await (0, locations_1.geocodeLocation)(geoQuery));
    if (!geo) {
        throw new Error(`تعذر تحديد موقع «${geoQuery}». أدخل حيّاً أو عنواناً أو اسم مدينة.`);
    }
    return {
        type: "GPS",
        code: `${geo.latitude.toFixed(5)},${geo.longitude.toFixed(5)}`,
        label: raw || geo.label || city,
    };
}
function sameTransferPoint(a, b) {
    return a.type === b.type && a.code.trim().toUpperCase() === b.code.trim().toUpperCase();
}
/**
 * Hotelbeds Transfers needs two distinct points (airport ↔ the chosen hotel).
 * Never rewrite a search into "airport → any hotel / city center".
 */
async function ensureDistinctTransferEndpoints(from, to) {
    if (!sameTransferPoint(from, to))
        return { from, to };
    throw new Error("حدد المطار والفندق كنقطتين مختلفتين. النقل إلى الفندق الذي تختاره، وليس إلى أي فندق.");
}
/** @deprecated Use resolveTransferEndpoint with explicit kind. */
async function resolveTransferEndpointLegacy(query) {
    const raw = query.trim();
    if (!raw) {
        throw new Error("حدد نقطة الاستلام أو التسليم");
    }
    const code = raw.toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) {
        return { type: "IATA", code, label: code };
    }
    return resolveTransferEndpoint({ query: raw, kind: "GPS" });
}
function mapService(service, input) {
    const rateKey = String(service.rateKey || "").trim();
    const providerCurrency = String(service.price?.currencyId || "EUR").toUpperCase();
    const displayCurrency = (0, hotelbeds_currency_1.hotelbedsDisplayCurrency)(input.currency);
    const amountRaw = Number(service.price?.totalAmount ?? service.price?.netAmount ?? 0);
    if (!rateKey || !Number.isFinite(amountRaw) || amountRaw <= 0)
        return null;
    const amount = (0, hotelbeds_currency_1.convertHotelbedsAmount)(amountRaw, providerCurrency, displayCurrency);
    const currency = displayCurrency;
    const transferType = String(service.transferType || "PRIVATE").toUpperCase();
    const vehicleName = textOf(service.vehicle?.name) || String(service.vehicle?.code || "مركبة");
    const categoryName = textOf(service.category?.name);
    const fromLabel = textOf(service.pickupInformation?.from?.description) || input.from.label;
    const toLabel = textOf(service.pickupInformation?.to?.description) || input.to.label;
    const cancel = service.cancellationPolicies?.[0];
    const cancelAmount = (0, hotelbeds_currency_1.convertHotelbedsAmount)(Number(cancel?.amount ?? 0), providerCurrency, displayCurrency);
    const imageUrl = service.content?.images?.find((img) => img.url)?.url;
    const detail = service.content?.transferDetailInfo?.[0]?.description;
    const sourceLabel = input.liveMode ? "Hotelbeds Transfers" : "تجريبي";
    const fetchedAt = new Date().toISOString();
    const typeLabel = (0, shared_1.transferTypeLabelAr)(transferType);
    const maxPax = service.maxPaxCapacity;
    const description = [typeLabel, vehicleName, categoryName, fromLabel, toLabel]
        .filter(Boolean)
        .join(" · ");
    return {
        providerKey: "hotelbeds-transfers",
        providerOfferRef: rateKey,
        description,
        costAmountMinor: (0, types_1.amountToMinor)(amount, currency),
        currency,
        revalidationToken: JSON.stringify({ rateKey, transferType }),
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        raw: {
            provider: "hotelbeds-transfers",
            liveMode: input.liveMode,
            source: input.liveMode ? "hotelbeds-transfers" : "mock",
            sourceLabel,
            fetchedAt,
            rateKey,
            transferType,
            transferTypeLabel: typeLabel,
            vehicleCode: service.vehicle?.code,
            vehicleName,
            categoryCode: service.category?.code,
            categoryName,
            direction: service.direction,
            fromLabel,
            toLabel,
            fromType: input.from.type,
            toType: input.to.type,
            city: input.city,
            outboundAt: input.outboundAt,
            inboundAt: input.inboundAt,
            minPax: service.minPaxCapacity,
            maxPax,
            imageUrl,
            freeCancellation: Number.isFinite(cancelAmount) && cancelAmount === 0,
            cancellationFrom: cancel?.from,
            cancellationAmount: Number.isFinite(cancelAmount) ? cancelAmount : undefined,
            description: detail || description,
        },
    };
}
class HotelbedsTransferProvider {
    providerKey = "hotelbeds-transfers";
    displayName = "Hotelbeds Transfers";
    liveMode;
    creds;
    constructor(creds) {
        this.creds = (0, hotelbeds_auth_1.resolveHotelbedsTransferCredentials)(creds);
        this.liveMode = Boolean(this.creds.apiKey && this.creds.apiSecret);
    }
    ensureConfigured() {
        if (!this.creds.apiKey || !this.creds.apiSecret) {
            throw new Error("مزود مواصلات Hotelbeds غير مُعدّ. أدخل HOTELBEDS_TRANSFER_API_KEY و HOTELBEDS_TRANSFER_API_SECRET");
        }
    }
    async fetchAvailability(input) {
        const pathParts = [
            "/transfer-api/1.0/availability/en/from",
            input.from.type,
            encodeSegment(input.from.code),
            "to",
            input.to.type,
            encodeSegment(input.to.code),
            input.outboundAt,
        ];
        if (input.inboundAt)
            pathParts.push(input.inboundAt);
        pathParts.push(String(input.adults), String(input.children), String(input.infants));
        const url = `${this.creds.baseUrl}${pathParts.join("/")}`;
        const response = await fetch(url, { headers: (0, hotelbeds_auth_1.hotelbedsHeaders)(this.creds) });
        const json = (await response.json().catch(() => ({})));
        if (!response.ok) {
            if (response.status === 400 || response.status === 404)
                return [];
            const detail = json.error?.message ||
                json.message ||
                (typeof json.error === "string" ? json.error : "") ||
                "";
            throw new Error(detail
                ? `تعذر جلب النقل: ${detail}`
                : `تعذر جلب النقل من Hotelbeds (HTTP ${response.status})`);
        }
        return (json.services || [])
            .map((service) => mapService(service, {
            from: input.from,
            to: input.to,
            liveMode: this.liveMode,
            outboundAt: input.outboundAt,
            inboundAt: input.inboundAt,
            city: input.city,
            currency: input.currency,
        }))
            .filter((row) => Boolean(row))
            .sort((a, b) => a.costAmountMinor - b.costAmountMinor);
    }
    async searchTransfers(params) {
        this.ensureConfigured();
        const city = String(params.city || "").trim();
        const fromKind = params.fromKind || "IATA";
        const toKind = params.toKind || "GPS";
        const resolvedFrom = await resolveTransferEndpoint({
            query: params.from,
            kind: fromKind,
            city,
        });
        const resolvedTo = await resolveTransferEndpoint({
            query: params.to,
            kind: toKind,
            city,
        });
        const { from, to } = await ensureDistinctTransferEndpoints(resolvedFrom, resolvedTo);
        const adults = Math.max(1, params.adults || 1);
        const children = Math.max(0, params.children || 0);
        const infants = Math.max(0, params.infants || 0);
        const outboundAt = datetimeStamp(params.outboundDate, params.outboundTime || "10:00");
        const inboundAt = params.inboundDate
            ? datetimeStamp(params.inboundDate, params.inboundTime || "18:00")
            : undefined;
        const fetchOnce = (origin, dest, returnAt) => this.fetchAvailability({
            from: origin,
            to: dest,
            outboundAt,
            inboundAt: returnAt,
            adults,
            children,
            infants,
            city,
            currency: params.currency,
        });
        let offers = await fetchOnce(from, to, inboundAt);
        if (!offers.length && inboundAt) {
            offers = await fetchOnce(from, to, undefined);
        }
        if (!offers.length && to.type === "ATLAS") {
            const gpsQuery = String(params.toLabel || city || "").trim();
            if (gpsQuery) {
                const gps = await resolveTransferEndpoint({
                    query: gpsQuery,
                    kind: "GPS",
                    city,
                });
                if (!sameTransferPoint(from, gps)) {
                    offers = await fetchOnce(from, gps, undefined);
                }
            }
        }
        return offers;
    }
    async createBooking(_offer, _guests) {
        throw new Error("حجز مواصلات Hotelbeds الحي غير مفعّل بعد — البحث يعمل عبر Sandbox");
    }
}
exports.HotelbedsTransferProvider = HotelbedsTransferProvider;
//# sourceMappingURL=hotelbeds-transfer-provider.js.map