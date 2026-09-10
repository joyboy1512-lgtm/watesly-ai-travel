"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAV_PERMISSIONS = exports.ROLE_PERMISSIONS = exports.ALL_PERMISSION_CODES = exports.PERMISSION_CATALOG = void 0;
exports.PERMISSION_CATALOG = [
    { code: "conversations.read", name: "قراءة المحادثات" },
    { code: "conversations.reply", name: "الرد على المحادثات" },
    { code: "campaigns.manage", name: "إدارة الحملات" },
    { code: "quotes.create", name: "إنشاء عروض الأسعار" },
    { code: "quotes.send", name: "إرسال عروض الأسعار" },
    { code: "pricing.manage", name: "إدارة قواعد التسعير" },
    { code: "pricing.override", name: "تجاوز التسعير" },
    { code: "pricing.view_cost", name: "عرض التكلفة والربح" },
    { code: "bookings.create", name: "إنشاء الحجوزات" },
    { code: "bookings.issue", name: "إصدار الحجوزات" },
    { code: "payments.manage", name: "إدارة المدفوعات" },
    { code: "providers.manage", name: "إدارة مزودي السفر" },
    { code: "users.manage", name: "إدارة المستخدمين" },
    { code: "whatsapp.manage", name: "إدارة واتساب" },
    { code: "reports.read", name: "قراءة التقارير" },
    { code: "settings.manage", name: "إدارة الإعدادات" },
    { code: "audit.read", name: "قراءة سجل التدقيق" },
];
exports.ALL_PERMISSION_CODES = exports.PERMISSION_CATALOG.map(function (p) { return p.code; });
exports.ROLE_PERMISSIONS = {
    owner: exports.ALL_PERMISSION_CODES,
    admin: exports.ALL_PERMISSION_CODES.filter(function (code) { return code !== "pricing.override"; }),
    agent: [
        "conversations.read",
        "conversations.reply",
        "quotes.create",
        "quotes.send",
        "bookings.create",
        "reports.read",
    ],
    viewer: ["conversations.read", "reports.read"],
};
exports.NAV_PERMISSIONS = {
    "/dashboard": null,
    "/dashboard/inquiries": "conversations.read",
    "/dashboard/inquiries/book": "quotes.create",
    "/dashboard/conversations": "conversations.read",
    "/dashboard/contacts": "conversations.read",
    "/dashboard/quotes": "conversations.read",
    "/dashboard/bookings": "conversations.read",
    "/dashboard/providers": "providers.manage",
    "/dashboard/pricing": "pricing.manage",
    "/dashboard/campaigns": "campaigns.manage",
    "/dashboard/templates": "campaigns.manage",
    "/dashboard/whatsapp": "whatsapp.manage",
    "/dashboard/users": "users.manage",
    "/dashboard/audit": "audit.read",
    "/dashboard/settings": "settings.manage",
};
