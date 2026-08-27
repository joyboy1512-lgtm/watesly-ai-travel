"use strict";
/** Shared mock scenario + currency helpers for flight/hotel providers. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioFromOfferRef = scenarioFromOfferRef;
exports.toMinorKwd = toMinorKwd;
exports.currencyExponent = currencyExponent;
exports.toMinor = toMinor;
function scenarioFromOfferRef(ref) {
    if (ref.includes("PRICE-CHANGE") || ref.includes("PRICE_CHANGE"))
        return "price_change";
    if (ref.includes("SOLD-OUT") || ref.includes("SOLD_OUT"))
        return "sold_out";
    if (ref.includes("PROVIDER-FAIL") || ref.includes("PROVIDER_FAIL"))
        return "provider_fail";
    if (ref.includes("UNAVAILABLE"))
        return "unavailable";
    return null;
}
function toMinorKwd(major) {
    return Math.round(major * 1000);
}
function currencyExponent(currency) {
    const code = currency.toUpperCase();
    return code === "KWD" || code === "BHD" || code === "OMR" || code === "JOD"
        ? 3
        : 2;
}
function toMinor(major, currency) {
    return Math.round(major * 10 ** currencyExponent(currency));
}
//# sourceMappingURL=scenario.js.map