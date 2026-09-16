"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amountToMinor = amountToMinor;
function amountToMinor(amount, currency) {
    if (currency === void 0) { currency = "KWD"; }
    var n = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(n))
        return 0;
    var code = (currency || "KWD").toUpperCase();
    var exp = code === "KWD" ||
        code === "BHD" ||
        code === "OMR" ||
        code === "JOD" ||
        code === "TND"
        ? 3
        : 2;
    return Math.round(n * Math.pow(10, exp));
}
