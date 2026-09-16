"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = require("bcryptjs");
var seed_travel_catalog_1 = require("./seed-travel-catalog");
var prisma = new client_1.PrismaClient();
var PERMISSIONS = [
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
var ROLE_PERMISSIONS = {
    owner: PERMISSIONS.map(function (p) { return p.code; }),
    admin: PERMISSIONS.map(function (p) { return p.code; }).filter(function (code) { return code !== "pricing.override"; }),
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
function upsertPermissions() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, PERMISSIONS_1, permission;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _i = 0, PERMISSIONS_1 = PERMISSIONS;
                    _a.label = 1;
                case 1:
                    if (!(_i < PERMISSIONS_1.length)) return [3 /*break*/, 4];
                    permission = PERMISSIONS_1[_i];
                    return [4 /*yield*/, prisma.permission.upsert({
                            where: { code: permission.code },
                            update: { name: permission.name },
                            create: permission,
                        })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function seedOrgDefaults(organizationId) {
    return __awaiter(this, void 0, void 0, function () {
        var existingRule, existingHotelRule;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.subscription.upsert({
                        where: { id: "".concat(organizationId, "-sub") },
                        update: { status: "active", planCode: "trial" },
                        create: {
                            id: "".concat(organizationId, "-sub"),
                            organizationId: organizationId,
                            planCode: "trial",
                            status: "active",
                            seatsLimit: 10,
                        },
                    })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, prisma.travelProviderConfig.upsert({
                            where: {
                                organizationId_providerKey: {
                                    organizationId: organizationId,
                                    providerKey: "duffel",
                                },
                            },
                            update: {
                                displayName: "Duffel (طيران وفنادق)",
                                enabled: true,
                                priority: 1,
                                capabilities: ["flight", "hotel"],
                            },
                            create: {
                                organizationId: organizationId,
                                providerKey: "duffel",
                                displayName: "Duffel (طيران وفنادق)",
                                enabled: true,
                                priority: 1,
                                capabilities: ["flight", "hotel"],
                            },
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, prisma.travelProviderConfig.upsert({
                            where: {
                                organizationId_providerKey: {
                                    organizationId: organizationId,
                                    providerKey: "mock",
                                },
                            },
                            update: {
                                displayName: "مزود تجريبي (Mock)",
                                enabled: true,
                                priority: 10,
                                capabilities: ["flight", "hotel"],
                            },
                            create: {
                                organizationId: organizationId,
                                providerKey: "mock",
                                displayName: "مزود تجريبي (Mock)",
                                enabled: true,
                                priority: 10,
                                capabilities: ["flight", "hotel"],
                            },
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.pricingRule.findFirst({
                            where: { organizationId: organizationId, name: "هامش طيران افتراضي" },
                        })];
                case 4:
                    existingRule = _a.sent();
                    if (!!existingRule) return [3 /*break*/, 6];
                    return [4 /*yield*/, prisma.pricingRule.create({
                            data: {
                                organizationId: organizationId,
                                name: "هامش طيران افتراضي",
                                serviceType: "flight",
                                ruleType: "percent_with_min",
                                percentValue: 12,
                                minProfitAmount: 1500,
                                currency: "KWD",
                                isActive: true,
                                priority: 1,
                            },
                        })];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [4 /*yield*/, prisma.pricingRule.findFirst({
                        where: { organizationId: organizationId, name: "هامش فنادق افتراضي" },
                    })];
                case 7:
                    existingHotelRule = _a.sent();
                    if (!!existingHotelRule) return [3 /*break*/, 9];
                    return [4 /*yield*/, prisma.pricingRule.create({
                            data: {
                                organizationId: organizationId,
                                name: "هامش فنادق افتراضي",
                                serviceType: "hotel",
                                ruleType: "percent_with_min",
                                percentValue: 15,
                                minProfitAmount: 1200,
                                currency: "KWD",
                                isActive: true,
                                priority: 1,
                            },
                        })];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [4 /*yield*/, prisma.whatsAppAccount.upsert({
                        where: {
                            organizationId_phoneNumberId: {
                                organizationId: organizationId,
                                phoneNumberId: "mock_".concat(organizationId.slice(0, 8)),
                            },
                        },
                        update: {
                            status: "connected",
                            accessTokenEnc: "mock",
                            displayPhone: "+966500000000",
                        },
                        create: {
                            organizationId: organizationId,
                            phoneNumberId: "mock_".concat(organizationId.slice(0, 8)),
                            businessAccountId: "mock_waba",
                            displayPhone: "+966500000000",
                            accessTokenEnc: "mock",
                            status: "connected",
                            webhookVerifiedAt: new Date(),
                        },
                    })];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, prisma.template.upsert({
                            where: {
                                organizationId_name_language: {
                                    organizationId: organizationId,
                                    name: "welcome_travel",
                                    language: "ar",
                                },
                            },
                            update: {
                                body: "مرحبًا بك في وكالتنا. أرسل وجهتك وتاريخ سفرك لنجهّز لك عرضًا.",
                                status: "approved",
                            },
                            create: {
                                organizationId: organizationId,
                                name: "welcome_travel",
                                language: "ar",
                                category: "utility",
                                status: "approved",
                                body: "مرحبًا بك في وكالتنا. أرسل وجهتك وتاريخ سفرك لنجهّز لك عرضًا.",
                            },
                        })];
                case 11:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function createOrgWithOwner(input) {
    return __awaiter(this, void 0, void 0, function () {
        var passwordHash, organization, allPermissions, permissionByCode, roleIds, _loop_1, _i, _a, _b, code, name_1, user;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, bcryptjs_1.default.hash(input.password, 12)];
                case 1:
                    passwordHash = _d.sent();
                    return [4 /*yield*/, prisma.organization.upsert({
                            where: { slug: input.orgSlug },
                            update: {
                                name: input.orgName,
                                status: "active",
                                defaultCurrency: "KWD",
                                timezone: "Asia/Kuwait",
                            },
                            create: {
                                name: input.orgName,
                                slug: input.orgSlug,
                                defaultCurrency: "KWD",
                                timezone: "Asia/Kuwait",
                                status: "active",
                            },
                        })];
                case 2:
                    organization = _d.sent();
                    return [4 /*yield*/, prisma.permission.findMany()];
                case 3:
                    allPermissions = _d.sent();
                    permissionByCode = new Map(allPermissions.map(function (p) { return [p.code, p.id]; }));
                    roleIds = {};
                    _loop_1 = function (code, name_1) {
                        var role, codes;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0: return [4 /*yield*/, prisma.role.upsert({
                                        where: {
                                            organizationId_code: {
                                                organizationId: organization.id,
                                                code: code,
                                            },
                                        },
                                        update: { name: name_1, isSystem: true },
                                        create: {
                                            organizationId: organization.id,
                                            code: code,
                                            name: name_1,
                                            isSystem: true,
                                        },
                                    })];
                                case 1:
                                    role = _e.sent();
                                    roleIds[code] = role.id;
                                    return [4 /*yield*/, prisma.rolePermission.deleteMany({ where: { roleId: role.id } })];
                                case 2:
                                    _e.sent();
                                    codes = (_c = ROLE_PERMISSIONS[code]) !== null && _c !== void 0 ? _c : [];
                                    if (!(codes.length > 0)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, prisma.rolePermission.createMany({
                                            data: codes
                                                .map(function (permissionCode) { return permissionByCode.get(permissionCode); })
                                                .filter(function (id) { return Boolean(id); })
                                                .map(function (permissionId) { return ({
                                                roleId: role.id,
                                                permissionId: permissionId,
                                            }); }),
                                            skipDuplicates: true,
                                        })];
                                case 3:
                                    _e.sent();
                                    _e.label = 4;
                                case 4: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = [
                        ["owner", "المالك"],
                        ["admin", "مدير"],
                        ["agent", "موظف مبيعات"],
                        ["viewer", "مشاهد"],
                    ];
                    _d.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    _b = _a[_i], code = _b[0], name_1 = _b[1];
                    return [5 /*yield**/, _loop_1(code, name_1)];
                case 5:
                    _d.sent();
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [4 /*yield*/, prisma.user.upsert({
                        where: { email: input.ownerEmail.toLowerCase() },
                        update: {
                            name: input.ownerName,
                            passwordHash: passwordHash,
                            status: "active",
                        },
                        create: {
                            email: input.ownerEmail.toLowerCase(),
                            name: input.ownerName,
                            passwordHash: passwordHash,
                            status: "active",
                        },
                    })];
                case 8:
                    user = _d.sent();
                    return [4 /*yield*/, prisma.membership.upsert({
                            where: {
                                organizationId_userId: {
                                    organizationId: organization.id,
                                    userId: user.id,
                                },
                            },
                            update: {
                                roleId: roleIds.owner,
                                status: "active",
                            },
                            create: {
                                organizationId: organization.id,
                                userId: user.id,
                                roleId: roleIds.owner,
                                status: "active",
                            },
                        })];
                case 9:
                    _d.sent();
                    return [4 /*yield*/, seedOrgDefaults(organization.id)];
                case 10:
                    _d.sent();
                    return [2 /*return*/, { organization: organization, user: user }];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var demo, other, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, upsertPermissions()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, createOrgWithOwner({
                            orgName: "وكالة واتسلي التجريبية",
                            orgSlug: "watesly-demo",
                            ownerName: "مالك تجريبي",
                            ownerEmail: "demo@watesly.travel",
                            password: "Demo1234!",
                        })];
                case 2:
                    demo = _a.sent();
                    return [4 /*yield*/, createOrgWithOwner({
                            orgName: "سفر الأفق",
                            orgSlug: "ufuq-travel",
                            ownerName: "مدير الأفق",
                            ownerEmail: "owner@ufuq.travel",
                            password: "Demo1234!",
                        })];
                case 3:
                    other = _a.sent();
                    _a.label = 4;
                case 4:
                    _a.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, seed_travel_catalog_1.seedTravelCatalog)(prisma)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    // eslint-disable-next-line no-console
                    console.warn("Travel catalog seed skipped/failed (network?). Run: pnpm --filter @watesly-travel/database exec tsx prisma/seed-travel-catalog.ts", error_1);
                    return [3 /*break*/, 7];
                case 7:
                    // eslint-disable-next-line no-console
                    console.log("Seed completed:");
                    // eslint-disable-next-line no-console
                    console.log("- ".concat(demo.organization.name, ": demo@watesly.travel / Demo1234!"));
                    // eslint-disable-next-line no-console
                    console.log("- ".concat(other.organization.name, ": owner@ufuq.travel / Demo1234!"));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
