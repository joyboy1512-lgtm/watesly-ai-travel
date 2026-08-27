"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.amountToMinor = amountToMinor;
function amountToMinor(amount, currency = "KWD") {
    const n = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(n))
        return 0;
    const code = (currency || "KWD").toUpperCase();
    const exp = code === "KWD" ||
        code === "BHD" ||
        code === "OMR" ||
        code === "JOD" ||
        code === "TND"
        ? 3
        : 2;
    return Math.round(n * 10 ** exp);
}
//# sourceMappingURL=types.js.map