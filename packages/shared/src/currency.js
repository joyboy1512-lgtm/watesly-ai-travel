"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CURRENCIES = exports.DEFAULT_TIMEZONE = exports.DEFAULT_CURRENCY = void 0;
exports.currencyExponent = currencyExponent;
exports.currencyMinorFactor = currencyMinorFactor;
exports.amountToMinorUnits = amountToMinorUnits;
exports.formatMoneyMinorShared = formatMoneyMinorShared;
exports.isSupportedCurrency = isSupportedCurrency;
/** ISO 4217 minor-unit exponents used for MoneyMinor storage. */
var CURRENCY_EXPONENTS = {
    KWD: 3,
    BHD: 3,
    OMR: 3,
    JOD: 3,
    TND: 3,
    IQD: 3,
    LYD: 3,
    CLF: 4,
    UYW: 4,
};
exports.DEFAULT_CURRENCY = "KWD";
exports.DEFAULT_TIMEZONE = "Asia/Kuwait";
exports.SUPPORTED_CURRENCIES = [
    { code: "KWD", label: "دينار كويتي", symbol: "د.ك" },
    { code: "SAR", label: "ريال سعودي", symbol: "ر.س" },
    { code: "AED", label: "درهم إماراتي", symbol: "د.إ" },
    { code: "QAR", label: "ريال قطري", symbol: "ر.ق" },
    { code: "BHD", label: "دينار بحريني", symbol: "د.ب" },
    { code: "OMR", label: "ريال عماني", symbol: "ر.ع" },
    { code: "EGP", label: "جنيه مصري", symbol: "ج.م" },
    { code: "USD", label: "دولار أمريكي", symbol: "$" },
    { code: "EUR", label: "يورو", symbol: "€" },
];
function currencyExponent(currency) {
    var _a;
    if (currency === void 0) { currency = exports.DEFAULT_CURRENCY; }
    var code = currency.trim().toUpperCase();
    return (_a = CURRENCY_EXPONENTS[code]) !== null && _a !== void 0 ? _a : 2;
}
function currencyMinorFactor(currency) {
    if (currency === void 0) { currency = exports.DEFAULT_CURRENCY; }
    return Math.pow(10, currencyExponent(currency));
}
function amountToMinorUnits(amount, currency) {
    if (currency === void 0) { currency = exports.DEFAULT_CURRENCY; }
    var n = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(n))
        return 0;
    return Math.round(n * currencyMinorFactor(currency));
}
function formatMoneyMinorShared(amountMinor, currency) {
    if (currency === void 0) { currency = exports.DEFAULT_CURRENCY; }
    if (amountMinor == null)
        return "—";
    var code = (currency || exports.DEFAULT_CURRENCY).toUpperCase();
    var exp = currencyExponent(code);
    var major = amountMinor / currencyMinorFactor(code);
    return "".concat(major.toFixed(exp), " ").concat(code);
}
function isSupportedCurrency(code) {
    var upper = code.trim().toUpperCase();
    return exports.SUPPORTED_CURRENCIES.some(function (c) { return c.code === upper; });
}
