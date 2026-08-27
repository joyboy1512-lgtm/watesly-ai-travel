"use strict";
/**
 * Realistic mock flight catalog for MockFlightProvider.
 * All amounts are major currency units (KWD unless noted); callers convert to minor.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_FLIGHT_TEMPLATES = exports.MOCK_DESTINATION_LABELS = exports.MOCK_ROUTE_MULTIPLIER = exports.MOCK_AIRLINES = void 0;
exports.minutesToDuration = minutesToDuration;
exports.addMinutesToIsoDate = addMinutesToIsoDate;
exports.MOCK_AIRLINES = {
    KU: { code: "KU", name: "Kuwait Airways", nameAr: "الخطوط الكويتية" },
    EK: { code: "EK", name: "Emirates", nameAr: "طيران الإمارات" },
    QR: { code: "QR", name: "Qatar Airways", nameAr: "الخطوط القطرية" },
    TK: { code: "TK", name: "Turkish Airlines", nameAr: "الخطوط التركية" },
    J9: { code: "J9", name: "Jazeera Airways", nameAr: "طيران الجزيرة" },
    XY: { code: "XY", name: "flynas", nameAr: "طيران ناس" },
    MS: { code: "MS", name: "EgyptAir", nameAr: "مصر للطيران" },
    J2: { code: "J2", name: "Azerbaijan Airlines", nameAr: "أذربيجان للطيران" },
    KE: { code: "KE", name: "Korean Air", nameAr: "كوريا للطيران" },
    BA: { code: "BA", name: "British Airways", nameAr: "الخطوط البريطانية" },
};
/** Destinations commonly searched from Kuwait */
exports.MOCK_ROUTE_MULTIPLIER = {
    DXB: 0.55,
    IST: 1.15,
    LHR: 1.85,
    LON: 1.85,
    GYD: 1.05,
    CAI: 0.85,
    ICN: 2.4,
    SEL: 2.4,
    DOH: 0.5,
    BAH: 0.35,
    RUH: 0.45,
    JED: 0.7,
};
exports.MOCK_DESTINATION_LABELS = {
    DXB: "دبي",
    IST: "إسطنبول",
    LHR: "لندن",
    LON: "لندن",
    GYD: "باكو",
    CAI: "القاهرة",
    ICN: "سيول",
    SEL: "سيول",
    KWI: "الكويت",
    DOH: "الدوحة",
    BAH: "البحرين",
};
const bagEcon = {
    personal: "حقيبة شخصية تحت المقعد",
    cabin: "حقيبة يد 7 كجم",
    checked: "أمتعة مسجّلة 23 كجم",
};
const bagBiz = {
    personal: "حقيبة شخصية تحت المقعد",
    cabin: "حقيبتا يد حتى 14 كجم",
    checked: "أمتعة مسجّلة 40 كجم × 2",
};
/** Core flight templates — adapted per origin/destination at search time */
exports.MOCK_FLIGHT_TEMPLATES = [
    {
        id: "direct-morning-ku",
        airlineCode: "KU",
        cabin: "economy",
        stops: 0,
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 8 * 60 + 40, durationMin: 195, flightNumberPrefix: "KU" },
        ],
        baseFareKwd: 38,
        taxesKwd: 12,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: false,
            changeFeeKwd: 15,
            cancelFeeKwd: 25,
            noteAr: "تغيير بمقابل · غير قابلة للاسترداد بعد الإقلاع",
        },
    },
    {
        id: "direct-noon-j9",
        airlineCode: "J9",
        cabin: "economy",
        stops: 0,
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 12 * 60 + 15, durationMin: 180, flightNumberPrefix: "J9" },
        ],
        baseFareKwd: 32,
        taxesKwd: 11,
        baggage: {
            personal: "حقيبة شخصية",
            cabin: "حقيبة يد 7 كجم",
            checked: "أمتعة مسجّلة اختيارية (رسوم)",
        },
        policies: {
            changeable: true,
            refundable: false,
            changeFeeKwd: 12,
            cancelFeeKwd: null,
            noteAr: "أجرة اقتصادية · الإلغاء غير متاح",
        },
    },
    {
        id: "direct-evening-ek",
        airlineCode: "EK",
        cabin: "economy",
        stops: 0,
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 18 * 60 + 5, durationMin: 200, flightNumberPrefix: "EK" },
        ],
        baseFareKwd: 55,
        taxesKwd: 18,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: true,
            changeFeeKwd: 20,
            cancelFeeKwd: 30,
            noteAr: "قابلة للاسترداد جزئيًا قبل 24 ساعة من المغادرة",
        },
    },
    {
        id: "transit-bah-xy",
        airlineCode: "XY",
        cabin: "economy",
        stops: 1,
        flexible: true,
        segments: [
            { from: "KWI", to: "BAH", departOffsetMin: 13 * 60 + 10, durationMin: 70, flightNumberPrefix: "XY" },
            { from: "BAH", to: "DEST", departOffsetMin: 16 * 60, durationMin: 170, flightNumberPrefix: "XY" },
        ],
        baseFareKwd: 45,
        taxesKwd: 16,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: true,
            changeFeeKwd: 10,
            cancelFeeKwd: 18,
            noteAr: "أجرة مرنة · تغيير مجاني مرة واحدة",
        },
    },
    {
        id: "transit-ist-tk",
        airlineCode: "TK",
        cabin: "economy",
        stops: 1,
        segments: [
            { from: "KWI", to: "IST", departOffsetMin: 9 * 60 + 20, durationMin: 240, flightNumberPrefix: "TK" },
            { from: "IST", to: "DEST", departOffsetMin: 15 * 60 + 40, durationMin: 220, flightNumberPrefix: "TK" },
        ],
        baseFareKwd: 62,
        taxesKwd: 22,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: false,
            changeFeeKwd: 25,
            cancelFeeKwd: 40,
            noteAr: "ترانزيت عبر إسطنبول · رسوم تغيير أعلى",
        },
    },
    {
        id: "business-ku",
        airlineCode: "KU",
        cabin: "business",
        stops: 0,
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 10 * 60 + 30, durationMin: 195, flightNumberPrefix: "KU" },
        ],
        baseFareKwd: 145,
        taxesKwd: 35,
        baggage: bagBiz,
        policies: {
            changeable: true,
            refundable: true,
            changeFeeKwd: 0,
            cancelFeeKwd: 40,
            noteAr: "درجة رجال الأعمال · تغيير مجاني · استرداد جزئي",
        },
    },
    {
        id: "business-qr",
        airlineCode: "QR",
        cabin: "business",
        stops: 1,
        segments: [
            { from: "KWI", to: "DOH", departOffsetMin: 7 * 60 + 50, durationMin: 75, flightNumberPrefix: "QR" },
            { from: "DOH", to: "DEST", departOffsetMin: 11 * 60 + 20, durationMin: 280, flightNumberPrefix: "QR" },
        ],
        baseFareKwd: 168,
        taxesKwd: 42,
        baggage: bagBiz,
        policies: {
            changeable: true,
            refundable: true,
            changeFeeKwd: 0,
            cancelFeeKwd: 50,
            noteAr: "Qsuite / Business عبر الدوحة",
        },
    },
    {
        id: "scenario-price-change",
        airlineCode: "EK",
        cabin: "economy",
        stops: 0,
        scenario: "price_change",
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 14 * 60 + 45, durationMin: 190, flightNumberPrefix: "EK" },
        ],
        baseFareKwd: 48,
        taxesKwd: 14,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: false,
            changeFeeKwd: 18,
            cancelFeeKwd: 28,
            noteAr: "سيناريو اختبار: قد يتغير السعر عند إعادة التحقق",
        },
    },
    {
        id: "scenario-sold-out",
        airlineCode: "BA",
        cabin: "economy",
        stops: 0,
        scenario: "sold_out",
        segments: [
            { from: "KWI", to: "DEST", departOffsetMin: 21 * 60 + 10, durationMin: 420, flightNumberPrefix: "BA" },
        ],
        baseFareKwd: 95,
        taxesKwd: 28,
        baggage: bagEcon,
        policies: {
            changeable: false,
            refundable: false,
            changeFeeKwd: null,
            cancelFeeKwd: null,
            noteAr: "سيناريو اختبار: قد يظهر غير متاح عند الحجز",
        },
    },
    {
        id: "scenario-provider-fail",
        airlineCode: "MS",
        cabin: "economy",
        stops: 1,
        scenario: "provider_fail",
        segments: [
            { from: "KWI", to: "CAI", departOffsetMin: 6 * 60 + 30, durationMin: 180, flightNumberPrefix: "MS" },
            { from: "CAI", to: "DEST", departOffsetMin: 11 * 60, durationMin: 200, flightNumberPrefix: "MS" },
        ],
        baseFareKwd: 52,
        taxesKwd: 17,
        baggage: bagEcon,
        policies: {
            changeable: true,
            refundable: false,
            changeFeeKwd: 20,
            cancelFeeKwd: 30,
            noteAr: "سيناريو اختبار: فشل مزود الخدمة عند الإصدار",
        },
    },
];
function minutesToDuration(totalMin) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function addMinutesToIsoDate(date, minutes) {
    const [y, mo, d] = date.split("-").map(Number);
    const base = new Date(Date.UTC(y, (mo || 1) - 1, d || 1, 0, 0, 0));
    base.setUTCMinutes(base.getUTCMinutes() + minutes);
    const hh = String(base.getUTCHours()).padStart(2, "0");
    const mm = String(base.getUTCMinutes()).padStart(2, "0");
    const ymd = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
    return { isoLocal: `${ymd}T${hh}:${mm}:00`, clock: `${hh}:${mm}` };
}
//# sourceMappingURL=mock-flight-catalog.js.map