"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INQUIRY_REQUIRED_FIELDS = exports.QUEUE_NAMES = exports.SENSITIVE_PERMISSIONS = exports.SYSTEM_ROLES = exports.SERVICE_TYPES = exports.DEFAULT_TIMEZONE = exports.DEFAULT_CURRENCY = exports.APP_NAME = void 0;
exports.APP_NAME = "Watesly Travel AI";
var currency_1 = require("./currency");
Object.defineProperty(exports, "DEFAULT_CURRENCY", { enumerable: true, get: function () { return currency_1.DEFAULT_CURRENCY; } });
Object.defineProperty(exports, "DEFAULT_TIMEZONE", { enumerable: true, get: function () { return currency_1.DEFAULT_TIMEZONE; } });
exports.SERVICE_TYPES = [
    "flight",
    "hotel",
    "insurance",
    "car",
    "transfer",
    "transport",
];
exports.SYSTEM_ROLES = ["owner", "admin", "agent", "viewer"];
exports.SENSITIVE_PERMISSIONS = [
    "pricing.manage",
    "pricing.override",
    "pricing.view_cost",
    "quotes.send",
    "bookings.create",
    "bookings.issue",
    "payments.manage",
    "providers.manage",
    "users.manage",
    "whatsapp.manage",
    "campaigns.manage",
    "audit.read",
];
exports.QUEUE_NAMES = {
    health: "health",
    inboundWhatsapp: "inbound-whatsapp",
    outboundWhatsapp: "outbound-whatsapp",
    aiExtract: "ai-extract",
    searchQuote: "search-quote",
    revalidate: "revalidate",
    campaignSend: "campaign-send",
};
exports.INQUIRY_REQUIRED_FIELDS = [
    "origin",
    "destination",
    "departDate",
    "adults",
];
