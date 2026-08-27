"use strict";
/** Hotelbeds contract/sandbox prices are typically EUR; display uses org currency. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hotelbedsDisplayCurrency = hotelbedsDisplayCurrency;
exports.hotelbedsSourceMarket = hotelbedsSourceMarket;
exports.convertHotelbedsAmount = convertHotelbedsAmount;
exports.canConvertHotelbedsCurrency = canConvertHotelbedsCurrency;
const SOURCE_MARKET = {
    KWD: "KW",
    SAR: "SA",
    AED: "AE",
    BHD: "BH",
    OMR: "OM",
    QAR: "QA",
    EGP: "EG",
    USD: "US",
    GBP: "GB",
    EUR: "ES",
};
/** Mid-market units of KWD per 1 unit of the source currency. Override with FX_<CODE>_KWD. */
const DEFAULT_TO_KWD = {
    KWD: 1,
    EUR: 0.355,
    USD: 0.307,
    GBP: 0.412,
    SAR: 0.082,
    AED: 0.0836,
    BHD: 0.815,
    OMR: 0.797,
    QAR: 0.0843,
    EGP: 0.0062,
};
function envRate(code, fallback) {
    const raw = Number(process.env[`FX_${code}_KWD`]);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}
function unitsPerKwd(code) {
    const upper = code.toUpperCase();
    const fallback = DEFAULT_TO_KWD[upper];
    if (fallback == null)
        return null;
    return envRate(upper, fallback);
}
function hotelbedsDisplayCurrency(requested) {
    return (requested ||
        process.env.HOTELBEDS_CURRENCY ||
        process.env.DEFAULT_CURRENCY ||
        "KWD")
        .trim()
        .toUpperCase();
}
function hotelbedsSourceMarket(currency) {
    const fromEnv = process.env.HOTELBEDS_SOURCE_MARKET?.trim().toUpperCase();
    if (fromEnv)
        return fromEnv;
    const code = hotelbedsDisplayCurrency(currency);
    return SOURCE_MARKET[code] || "KW";
}
function convertHotelbedsAmount(amount, fromCurrency, toCurrency) {
    const from = (fromCurrency || "EUR").toUpperCase();
    const to = (toCurrency || "KWD").toUpperCase();
    if (!Number.isFinite(amount) || from === to)
        return amount;
    const fromKwd = unitsPerKwd(from);
    const toKwd = unitsPerKwd(to);
    if (fromKwd == null || toKwd == null || toKwd <= 0)
        return amount;
    const converted = amount * (fromKwd / toKwd);
    const exp = to === "KWD" || to === "BHD" || to === "OMR" || to === "JOD" ? 3 : 2;
    const factor = 10 ** exp;
    return Math.round(converted * factor) / factor;
}
function canConvertHotelbedsCurrency(from, to) {
    const a = from.toUpperCase();
    const b = to.toUpperCase();
    if (a === b)
        return true;
    return unitsPerKwd(a) != null && unitsPerKwd(b) != null;
}
//# sourceMappingURL=hotelbeds-currency.js.map