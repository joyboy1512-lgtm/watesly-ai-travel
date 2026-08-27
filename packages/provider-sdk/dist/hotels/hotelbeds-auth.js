"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHotelbedsCredentials = resolveHotelbedsCredentials;
exports.resolveHotelbedsActivityCredentials = resolveHotelbedsActivityCredentials;
exports.resolveHotelbedsTransferCredentials = resolveHotelbedsTransferCredentials;
exports.hotelbedsSignature = hotelbedsSignature;
exports.hotelbedsHeaders = hotelbedsHeaders;
const node_crypto_1 = require("node:crypto");
function resolveHotelbedsCredentials(creds) {
    const apiKey = creds?.apiKey?.trim() || process.env.HOTELBEDS_API_KEY?.trim() || "";
    const apiSecret = creds?.apiSecret?.trim() ||
        process.env.HOTELBEDS_API_SECRET?.trim() ||
        process.env.HOTELBEDS_SECRET?.trim() ||
        "";
    const baseUrl = (creds?.baseUrl?.trim() ||
        process.env.HOTELBEDS_BASE_URL?.trim() ||
        "https://api.test.hotelbeds.com").replace(/\/$/, "");
    return { apiKey, apiSecret, baseUrl };
}
function resolveHotelbedsActivityCredentials(creds) {
    const apiKey = creds?.apiKey?.trim() ||
        process.env.HOTELBEDS_ACTIVITY_API_KEY?.trim() ||
        "";
    const apiSecret = creds?.apiSecret?.trim() ||
        process.env.HOTELBEDS_ACTIVITY_API_SECRET?.trim() ||
        "";
    const baseUrl = (creds?.baseUrl?.trim() ||
        process.env.HOTELBEDS_ACTIVITY_BASE_URL?.trim() ||
        "https://api.test.hotelbeds.com").replace(/\/$/, "");
    return { apiKey, apiSecret, baseUrl };
}
function resolveHotelbedsTransferCredentials(creds) {
    const apiKey = creds?.apiKey?.trim() ||
        process.env.HOTELBEDS_TRANSFER_API_KEY?.trim() ||
        "";
    const apiSecret = creds?.apiSecret?.trim() ||
        process.env.HOTELBEDS_TRANSFER_API_SECRET?.trim() ||
        "";
    const baseUrl = (creds?.baseUrl?.trim() ||
        process.env.HOTELBEDS_TRANSFER_BASE_URL?.trim() ||
        "https://api.test.hotelbeds.com").replace(/\/$/, "");
    return { apiKey, apiSecret, baseUrl };
}
function hotelbedsSignature(apiKey, apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    return (0, node_crypto_1.createHash)("sha256")
        .update(`${apiKey}${apiSecret}${timestamp}`)
        .digest("hex");
}
function hotelbedsHeaders(creds) {
    return {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
        "Api-key": creds.apiKey,
        "X-Signature": hotelbedsSignature(creds.apiKey, creds.apiSecret),
    };
}
//# sourceMappingURL=hotelbeds-auth.js.map