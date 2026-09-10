/**
 * Central Arabic normalization for Hotelbeds / flight provider content.
 * Prefer this over ad-hoc string handling inside React components.
 */

export type LocalizedLabel = {
  ar: string;
  /** Original provider text when useful for “عرض النص الأصلي”. */
  original?: string;
};

/** Dual: 1 واحد / 2 dual / 3–10 plural / 11+ plural-with-number */
function arabicCount(n: number, one: string, dual: string, plural: string, withNum: string): string {
  const v = Math.max(0, Math.floor(n));
  if (v === 0) return "";
  if (v === 1) return one;
  if (v === 2) return dual;
  if (v >= 3 && v <= 10) return `${v} ${plural}`;
  return `${v} ${withNum}`;
}

export function arabicNightCount(n: number): string {
  return arabicCount(n, "ليلة واحدة", "ليلتان", "ليالٍ", "ليلة");
}

export function arabicRoomCount(n: number): string {
  return arabicCount(n, "غرفة واحدة", "غرفتان", "غرف", "غرفة");
}

export function arabicAdultCount(n: number): string {
  return arabicCount(n, "بالغ واحد", "بالغان", "بالغون", "بالغًا");
}

export function arabicChildCount(n: number): string {
  if (n <= 0) return "";
  return arabicCount(n, "طفل واحد", "طفلان", "أطفال", "طفلًا");
}

export function arabicGuestCount(n: number): string {
  return arabicCount(n, "ضيف واحد", "ضيفان", "ضيوف", "ضيفًا");
}

export function arabicTravelerCount(n: number): string {
  return arabicCount(n, "مسافر واحد", "مسافران", "مسافرون", "مسافرًا");
}

/** Avoid “7 7 ليالٍ” when UI already prints the number separately. */
export function arabicNightWord(n: number): string {
  if (n === 1) return "ليلة";
  if (n === 2) return "ليلتان";
  if (n >= 3 && n <= 10) return "ليالٍ";
  return "ليلة";
}

export function arabicRoomWord(n: number): string {
  if (n === 1) return "غرفة";
  if (n === 2) return "غرفتان";
  if (n >= 3 && n <= 10) return "غرف";
  return "غرفة";
}

const BOARD_MAP: Record<string, string> = {
  RO: "غرفة فقط",
  BB: "إفطار",
  HB: "نصف إقامة",
  FB: "إقامة كاملة",
  AI: "شامل كل شيء",
  SC: "خدمة ذاتية",
  BED_AND_BREAKFAST: "إفطار",
  ROOM_ONLY: "غرفة فقط",
  HALF_BOARD: "نصف إقامة",
  FULL_BOARD: "إقامة كاملة",
  ALL_INCLUSIVE: "شامل كل شيء",
};

export function normalizeBoardLabelAr(codeOrLabel: string | null | undefined): LocalizedLabel {
  const raw = (codeOrLabel || "").trim();
  if (!raw) return { ar: "غرفة فقط" };
  const key = raw.toUpperCase().replace(/\s+/g, "_");
  if (BOARD_MAP[key]) return { ar: BOARD_MAP[key], original: raw };
  if (BOARD_MAP[raw.toUpperCase()]) return { ar: BOARD_MAP[raw.toUpperCase()]!, original: raw };
  const lower = raw.toLowerCase();
  if (lower.includes("breakfast") || lower.includes("إفطار")) return { ar: "إفطار", original: raw };
  if (lower.includes("half")) return { ar: "نصف إقامة", original: raw };
  if (lower.includes("full")) return { ar: "إقامة كاملة", original: raw };
  if (lower.includes("all inclusive") || lower.includes("inclusive")) {
    return { ar: "شامل كل شيء", original: raw };
  }
  if (lower.includes("room only") || lower === "ro") return { ar: "غرفة فقط", original: raw };
  return { ar: raw, original: raw };
}

const BED_MAP: Array<[RegExp, string]> = [
  [/twin|two single|سريرين منفصلين|سريرين مفردين/i, "غرفة بسريرين منفصلين"],
  [/double|queen|king|مزدوج|دبل/i, "غرفة مزدوجة"],
  [/single|مفرد/i, "غرفة مفردة"],
  [/triple|ثلاثي/i, "غرفة ثلاثية"],
  [/quad|family|عائلي/i, "غرفة عائلية"],
  [/sofa bed|سرير أريكة/i, "سرير أريكة"],
  [/bunk|طابقين/i, "سرير بطابقين"],
];

export function normalizeBedTypeAr(raw: string | null | undefined): LocalizedLabel {
  const text = (raw || "").trim();
  if (!text) return { ar: "" };
  for (const [re, ar] of BED_MAP) {
    if (re.test(text)) return { ar, original: text };
  }
  return { ar: text, original: text };
}

const ROOM_TYPE_MAP: Array<[RegExp, string]> = [
  [/standard/i, "غرفة قياسية"],
  [/superior/i, "غرفة متفوقة"],
  [/deluxe/i, "غرفة ديلوكس"],
  [/suite/i, "جناح"],
  [/studio/i, "استوديو"],
  [/apartment|apto/i, "شقة"],
  [/villa/i, "فيلا"],
  [/connecting/i, "غرف متصلة"],
  [/accessible|adapted|disability|wheelchair/i, "غرفة مهيأة لسهولة الوصول"],
];

export function normalizeRoomTypeAr(raw: string | null | undefined): LocalizedLabel {
  const text = (raw || "").trim();
  if (!text) return { ar: "غرفة" };
  for (const [re, ar] of ROOM_TYPE_MAP) {
    if (re.test(text)) return { ar, original: text };
  }
  return { ar: text, original: text };
}

export type CancelPolicyKind =
  | "free_until"
  | "partial_refund"
  | "non_refundable"
  | "non_refundable_now"
  | "unknown";

export function normalizeCancelPolicyAr(input: {
  kind?: CancelPolicyKind;
  freeUntilIso?: string | null;
  feeLabel?: string | null;
}): LocalizedLabel {
  const kind = input.kind || "unknown";
  if (kind === "non_refundable_now") {
    return { ar: "غير قابل للاسترداد الآن" };
  }
  if (kind === "non_refundable") {
    return { ar: "غير قابل للاسترداد" };
  }
  if (kind === "partial_refund") {
    return {
      ar: input.feeLabel
        ? `استرداد جزئي — ${input.feeLabel}`
        : "استرداد جزئي حسب شروط المزوّد",
    };
  }
  if (kind === "free_until" && input.freeUntilIso) {
    try {
      const d = new Date(input.freeUntilIso);
      if (!Number.isNaN(d.getTime())) {
        const label = new Intl.DateTimeFormat("ar", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(d);
        return { ar: `إلغاء مجاني حتى ${label}` };
      }
    } catch {
      /* fall through */
    }
    return { ar: "إلغاء مجاني حتى تاريخ محدد" };
  }
  if (kind === "free_until") return { ar: "إلغاء مجاني" };
  return { ar: "راجع شروط الإلغاء" };
}

const ACCESSIBILITY_MAP: Array<[RegExp, string]> = [
  [/wheelchair|accessible|adapted|disability|handicap|ذوي الإعاقة|كراسي متحركة/i, "مرافق مهيأة لسهولة الوصول"],
  [/elevator|lift|مصعد/i, "مصعد"],
  [/ramp|منحدر/i, "منحدر وصول"],
];

export function normalizeAccessibilityLabelAr(raw: string | null | undefined): LocalizedLabel {
  const text = (raw || "").trim();
  if (!text) return { ar: "" };
  for (const [re, ar] of ACCESSIBILITY_MAP) {
    if (re.test(text)) return { ar, original: text };
  }
  return { ar: text, original: text };
}

const PAYMENT_MAP: Record<string, string> = {
  AT_WEB: "الدفع عبر الإنترنت",
  AT_HOTEL: "الدفع في مكان الإقامة",
  AT_DESTINATION: "الدفع في مكان الإقامة",
  ONLINE: "الدفع عبر الإنترنت",
  PAY_AT_PROPERTY: "الدفع في مكان الإقامة",
};

export function normalizePaymentTypeAr(raw: string | null | undefined): LocalizedLabel {
  const text = (raw || "").trim();
  if (!text) return { ar: "الدفع عبر الإنترنت" };
  const key = text.toUpperCase().replace(/\s+/g, "_");
  if (PAYMENT_MAP[key]) return { ar: PAYMENT_MAP[key], original: text };
  if (/hotel|property|destination|فندق|إقامة/i.test(text)) {
    return { ar: "الدفع في مكان الإقامة", original: text };
  }
  return { ar: text, original: text };
}

const CITY_ALIASES: Record<string, string> = {
  DXB: "دبي",
  DUBAI: "دبي",
  AUH: "أبوظبي",
  ABU_DHABI: "أبوظبي",
  SHJ: "الشارقة",
  SHARJAH: "الشارقة",
  RUH: "الرياض",
  RIYADH: "الرياض",
  JED: "جدة",
  JEDDAH: "جدة",
  CAI: "القاهرة",
  CAIRO: "القاهرة",
  IST: "إسطنبول",
  ISTANBUL: "إسطنبول",
  KWI: "الكويت",
  KUWAIT: "الكويت",
  DOH: "الدوحة",
  DOHA: "الدوحة",
  BAH: "البحرين",
  BAHRAIN: "البحرين",
};

export function normalizeCityNameAr(raw: string | null | undefined): LocalizedLabel {
  const text = (raw || "").trim();
  if (!text) return { ar: "" };
  const key = text.toUpperCase().replace(/\s+/g, "_");
  if (CITY_ALIASES[key]) return { ar: CITY_ALIASES[key], original: text };
  return { ar: text, original: text };
}

const AIRLINE_ALIASES: Record<string, string> = {
  KU: "الخطوط الجوية الكويتية",
  EK: "طيران الإمارات",
  EY: "الاتحاد للطيران",
  QR: "الخطوط القطرية",
  SV: "السعودية",
  FZ: "فلاي دبي",
  G9: "العربية للطيران",
  J9: "الخطوط الجوية الجوية",
  MS: "مصر للطيران",
  TK: "الخطوط التركية",
  WY: "الطيران العماني",
  GF: "طيران الخليج",
};

export function normalizeAirlineNameAr(
  code: string | null | undefined,
  name?: string | null,
): LocalizedLabel {
  const c = (code || "").trim().toUpperCase();
  if (c && AIRLINE_ALIASES[c]) {
    return { ar: AIRLINE_ALIASES[c], original: name || c };
  }
  if (name?.trim()) return { ar: name.trim(), original: name.trim() };
  return { ar: c || "شركة طيران", original: c || undefined };
}

const BOOKING_STATUS_AR: Record<string, string> = {
  PENDING: "قيد المعالجة",
  CONFIRMED: "مؤكد",
  FAILED: "فشل",
  CANCELLED: "ملغى",
  REFUND_PENDING: "استرداد قيد المعالجة",
  REFUNDED: "تم الاسترداد",
  MANUAL_REVIEW: "يتطلب مراجعة يدوية",
  EXPIRED: "منتهٍ",
};

export function normalizeBookingStatusAr(status: string | null | undefined): LocalizedLabel {
  const key = (status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (BOOKING_STATUS_AR[key]) return { ar: BOOKING_STATUS_AR[key], original: status || undefined };
  return { ar: status || "غير معروف", original: status || undefined };
}

const PAYMENT_STATUS_AR: Record<string, string> = {
  PENDING: "بانتظار الدفع",
  AUTHORIZED: "مصرّح",
  CAPTURED: "تم الدفع",
  FAILED: "فشل الدفع",
  CANCELLED: "أُلغي الدفع",
  EXPIRED: "انتهت جلسة الدفع",
  REFUNDED: "تم الاسترداد",
};

export function normalizePaymentStatusAr(status: string | null | undefined): LocalizedLabel {
  const key = (status || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (PAYMENT_STATUS_AR[key]) return { ar: PAYMENT_STATUS_AR[key], original: status || undefined };
  return { ar: status || "غير معروف", original: status || undefined };
}

/** Soften raw English fragments inside an Arabic sentence when possible. */
export function scrubEnglishFragmentInAr(sentence: string): string {
  return sentence
    .replace(/\bRoom Only\b/gi, "غرفة فقط")
    .replace(/\bBed and Breakfast\b/gi, "إفطار")
    .replace(/\bHalf Board\b/gi, "نصف إقامة")
    .replace(/\bFull Board\b/gi, "إقامة كاملة")
    .replace(/\bAll Inclusive\b/gi, "شامل كل شيء")
    .replace(/\bNon[- ]?Refundable\b/gi, "غير قابل للاسترداد")
    .replace(/\bPay at (hotel|property)\b/gi, "الدفع في مكان الإقامة")
    .replace(/\bwheelchair accessible\b/gi, "مهيأة لسهولة الوصول")
    .replace(/\bdisabled\b/gi, "سهولة الوصول");
}
