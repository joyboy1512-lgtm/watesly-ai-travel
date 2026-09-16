"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.parseMrzText = parseMrzText;
exports.extractPassportFromImage = extractPassportFromImage;
function stripDataUrl(base64) {
    var idx = base64.indexOf("base64,");
    return idx >= 0 ? base64.slice(idx + 7) : base64;
}
function normalizeDate(value) {
    if (!value)
        return undefined;
    var trimmed = value.trim();
    var iso = trimmed.match(/^(20\d{2}|19\d{2})-(\d{2})-(\d{2})$/);
    if (iso)
        return trimmed;
    var dmy = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](19\d{2}|20\d{2})$/);
    if (dmy) {
        return "".concat(dmy[3], "-").concat(dmy[2].padStart(2, "0"), "-").concat(dmy[1].padStart(2, "0"));
    }
    // YYMMDD from MRZ
    var mrz = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
    if (mrz) {
        var yy = Number(mrz[1]);
        var year = yy >= 50 ? 1900 + yy : 2000 + yy;
        return "".concat(year, "-").concat(mrz[2], "-").concat(mrz[3]);
    }
    return undefined;
}
function guessTitle(sex) {
    if (!sex)
        return undefined;
    var s = sex.trim().toUpperCase();
    if (s === "M" || s === "MALE" || s === "ذكر")
        return "mr";
    if (s === "F" || s === "FEMALE" || s === "أنثى" || s === "انثى")
        return "mrs";
    return undefined;
}
/** Parse ICAO MRZ TD3 lines when present in OCR text. */
function parseMrzText(text) {
    var lines = text
        .toUpperCase()
        .replace(/\r/g, "")
        .split("\n")
        .map(function (l) { return l.replace(/\s+/g, "").trim(); })
        .filter(function (l) { return l.includes("<") && l.length >= 28; });
    var line1 = lines.find(function (l) { return l.startsWith("P<") || l.startsWith("P"); });
    var line2 = lines.find(function (l) { return !l.startsWith("P") && /^[A-Z0-9<]{28,}$/.test(l); });
    var fields = {};
    if (line1) {
        var cleaned = line1.startsWith("P<") ? line1.slice(2) : line1.slice(1);
        var nationality = cleaned.slice(0, 3).replace(/</g, "");
        var names = cleaned.slice(3).split("<<");
        var lastName = (names[0] || "").replace(/</g, " ").trim();
        var firstName = (names[1] || "").replace(/</g, " ").trim();
        if (nationality)
            fields.nationality = nationality;
        if (lastName)
            fields.lastName = lastName;
        if (firstName)
            fields.firstName = firstName;
    }
    if (line2) {
        var passportNumber = line2.slice(0, 9).replace(/</g, "");
        var nationality = line2.slice(10, 13).replace(/</g, "");
        var birth = normalizeDate(line2.slice(13, 19));
        var sex = line2.slice(20, 21);
        var expiry = normalizeDate(line2.slice(21, 27));
        if (passportNumber)
            fields.passportNumber = passportNumber;
        if (nationality)
            fields.nationality = fields.nationality || nationality;
        if (birth)
            fields.birthDate = birth;
        if (expiry)
            fields.passportExpiry = expiry;
        var title = guessTitle(sex);
        if (title)
            fields.title = title;
    }
    return fields;
}
function parseJsonObject(content) {
    var fenced = content.match(/\{[\s\S]*\}/);
    if (!fenced)
        return null;
    try {
        return JSON.parse(fenced[0]);
    }
    catch (_a) {
        return null;
    }
}
function fieldsFromModelJson(data) {
    var str = function (k) {
        var v = data[k];
        return typeof v === "string" && v.trim() ? v.trim() : undefined;
    };
    return {
        title: guessTitle(str("sex") || str("gender")) || str("title"),
        firstName: str("firstName") || str("givenNames") || str("given_names"),
        lastName: str("lastName") || str("surname") || str("familyName"),
        birthDate: normalizeDate(str("birthDate") || str("dateOfBirth") || str("dob")),
        nationality: (str("nationality") || str("issuingCountry") || "")
            .toUpperCase()
            .slice(0, 3) || undefined,
        passportNumber: str("passportNumber") || str("documentNumber") || str("number"),
        passportExpiry: normalizeDate(str("passportExpiry") || str("expiryDate") || str("dateOfExpiry")),
    };
}
function hasUsefulFields(fields) {
    return Boolean(fields.passportNumber ||
        (fields.firstName && fields.lastName) ||
        fields.birthDate);
}
function aiConfig() {
    var apiKey = process.env.OPENAI_API_KEY ||
        process.env.AI_API_KEY ||
        "";
    var baseUrl = (process.env.AI_BASE_URL ||
        process.env.OPENAI_BASE_URL ||
        "https://api.openai.com/v1").replace(/\/$/, "");
    var model = process.env.AI_VISION_MODEL ||
        process.env.AI_MODEL ||
        "gpt-4o-mini";
    var timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000);
    return { apiKey: apiKey, baseUrl: baseUrl, model: model, timeoutMs: timeoutMs };
}
/**
 * Extract passport fields from an image using a vision-capable LLM.
 * Falls back to MRZ parsing from any returned text.
 */
function extractPassportFromImage(input) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, apiKey, baseUrl, model, timeoutMs, mime, rawBase64, prompt, controller, timer, response, errText, payload, content, json, fields, mrzText, mrzFields, confidenceRaw, confidence, map, error_1;
        var _b, _c, _d, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    _a = aiConfig(), apiKey = _a.apiKey, baseUrl = _a.baseUrl, model = _a.model, timeoutMs = _a.timeoutMs;
                    mime = input.mimeType || "image/jpeg";
                    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
                        throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP");
                    }
                    rawBase64 = stripDataUrl(input.imageBase64);
                    if (!rawBase64 || rawBase64.length < 100) {
                        throw new Error("صورة الجواز غير صالحة");
                    }
                    // ~6MB decoded roughly
                    if (rawBase64.length > 8000000) {
                        throw new Error("حجم الصورة كبير جدًا. استخدم صورة أوضح وأصغر من 6MB");
                    }
                    if (!apiKey) {
                        return [2 /*return*/, {
                                fields: {},
                                confidence: 0,
                                provider: "none",
                                model: "unconfigured",
                                notes: "فعّل OPENAI_API_KEY أو AI_API_KEY في ملف البيئة لتفعيل مسح الجواز بالذكاء الاصطناعي",
                            }];
                    }
                    prompt = "You are a passport MRZ/OCR assistant for a travel booking system.\nRead the passport image carefully (visual zone and MRZ if visible).\nReturn ONLY valid JSON with these keys:\n{\n  \"firstName\": string,\n  \"lastName\": string,\n  \"birthDate\": \"YYYY-MM-DD\",\n  \"nationality\": \"ISO3 like SAU or 2-letter like SA if that is what appears\",\n  \"passportNumber\": string,\n  \"passportExpiry\": \"YYYY-MM-DD\",\n  \"sex\": \"M or F\",\n  \"mrzText\": \"optional raw MRZ lines\",\n  \"confidence\": number between 0 and 1\n}\nUse empty string for unknown fields. Do not invent values.";
                    controller = new AbortController();
                    timer = setTimeout(function () { return controller.abort(); }, timeoutMs);
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 6, 7, 8]);
                    return [4 /*yield*/, fetch("".concat(baseUrl, "/chat/completions"), {
                            method: "POST",
                            headers: {
                                Authorization: "Bearer ".concat(apiKey),
                                "Content-Type": "application/json",
                            },
                            signal: controller.signal,
                            body: JSON.stringify({
                                model: model,
                                temperature: 0,
                                max_tokens: Number(process.env.AI_MAX_OUTPUT_TOKENS || 800),
                                messages: [
                                    {
                                        role: "user",
                                        content: [
                                            { type: "text", text: prompt },
                                            {
                                                type: "image_url",
                                                image_url: {
                                                    url: "data:".concat(mime, ";base64,").concat(rawBase64),
                                                },
                                            },
                                        ],
                                    },
                                ],
                            }),
                        })];
                case 2:
                    response = _f.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text().catch(function () { return ""; })];
                case 3:
                    errText = _f.sent();
                    throw new Error("\u0641\u0634\u0644 \u0645\u0633\u062D \u0627\u0644\u062C\u0648\u0627\u0632 \u0639\u0628\u0631 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A (".concat(response.status, ")").concat(errText ? ": ".concat(errText.slice(0, 180)) : ""));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    payload = (_f.sent());
                    content = ((_e = (_d = (_c = (_b = payload.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.message) === null || _d === void 0 ? void 0 : _d.content) === null || _e === void 0 ? void 0 : _e.trim()) || "";
                    json = parseJsonObject(content);
                    fields = json ? fieldsFromModelJson(json) : {};
                    mrzText = (typeof (json === null || json === void 0 ? void 0 : json.mrzText) === "string" && json.mrzText) || content;
                    mrzFields = parseMrzText(mrzText);
                    fields = __assign(__assign({}, mrzFields), Object.fromEntries(Object.entries(fields).filter(function (_a) {
                        var v = _a[1];
                        return Boolean(v);
                    })));
                    confidenceRaw = typeof (json === null || json === void 0 ? void 0 : json.confidence) === "number" ? json.confidence : undefined;
                    confidence = confidenceRaw !== null && confidenceRaw !== void 0 ? confidenceRaw : (hasUsefulFields(fields) ? 0.75 : 0.2);
                    if (!hasUsefulFields(fields)) {
                        return [2 /*return*/, {
                                fields: fields,
                                confidence: 0,
                                provider: "openai-compatible",
                                model: model,
                                rawText: content.slice(0, 500),
                                notes: "تعذر قراءة بيانات كافية من الصورة. جرّب صورة أوضح لصفحة الجواز",
                            }];
                    }
                    // Normalize nationality to 2 letters when common ISO3 codes appear
                    if (fields.nationality && fields.nationality.length === 3) {
                        map = {
                            SAU: "SA",
                            ARE: "AE",
                            KWT: "KW",
                            QAT: "QA",
                            BHR: "BH",
                            OMN: "OM",
                            EGY: "EG",
                            JOR: "JO",
                            USA: "US",
                            GBR: "GB",
                        };
                        fields.nationality = map[fields.nationality] || fields.nationality;
                    }
                    return [2 /*return*/, {
                            fields: fields,
                            confidence: confidence,
                            provider: "openai-compatible",
                            model: model,
                            rawText: typeof (json === null || json === void 0 ? void 0 : json.mrzText) === "string" ? json.mrzText : undefined,
                        }];
                case 6:
                    error_1 = _f.sent();
                    if (error_1 instanceof Error && error_1.name === "AbortError") {
                        throw new Error("انتهت مهلة مسح الجواز. حاول مجددًا بصورة أصغر");
                    }
                    throw error_1;
                case 7:
                    clearTimeout(timer);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    });
}
