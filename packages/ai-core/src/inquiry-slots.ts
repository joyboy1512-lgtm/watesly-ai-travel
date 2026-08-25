import type { ServiceType, TravelInquiryFields } from "@watesly-travel/shared";
import { SERVICE_TYPE_CLARIFY_QUESTION, hasExplicitServiceTypes } from "./service-intent";

export const HOTEL_UPSELL_PROMPT =
  "🏨 هل تريد البحث عن فنادق في الوجهة أيضاً؟\n• اكتب «ابحث عن فنادق» لعرض خيارات\n• أو اذكر *اسم فندق* معيّن لمعرفة أسعاره";

export type InquirySlot =
  | "serviceTypes"
  | "origin"
  | "destination"
  | "departDate"
  | "returnDate"
  | "adults"
  | "rooms"
  | "children";

export type AiTravelContext = TravelInquiryFields & {
  /** Set after flight-only results — waiting for hotel upsell answer. */
  awaitingHotelUpsell?: boolean;
};

export function wantsFlight(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("flight"));
}

export function wantsHotel(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("hotel"));
}

export function wantsTransfer(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("transfer"));
}

/** Fields still needed before search — returns only what is actually missing. */
export function computeInquiryMissing(fields: TravelInquiryFields): InquirySlot[] {
  const missing: InquirySlot[] = [];

  if (!hasExplicitServiceTypes(fields.serviceTypes)) {
    missing.push("serviceTypes");
    return missing;
  }

  const types = fields.serviceTypes!;
  const flight = wantsFlight(types);
  const hotel = wantsHotel(types);

  if (flight && !fields.origin) {
    missing.push("origin");
  }
  if (!fields.destination) {
    missing.push("destination");
  }
  if (!fields.departDate) {
    missing.push("departDate");
  }
  if (hotel && !fields.returnDate) {
    missing.push("returnDate");
  }
  if (!fields.adults) {
    missing.push("adults");
  }
  if (hotel && !fields.rooms) {
    missing.push("rooms");
  }

  return missing;
}

export function nextInquiryQuestion(
  missing: InquirySlot[],
  fields: TravelInquiryFields,
): string | null {
  if (!missing.length) return null;

  const slot = missing[0]!;
  const hotel = wantsHotel(fields.serviceTypes);
  const flight = wantsFlight(fields.serviceTypes);

  const questions: Record<InquirySlot, string> = {
    serviceTypes: SERVICE_TYPE_CLARIFY_QUESTION,
    origin: "من أي مدينة أو مطار ترغب بالمغادرة؟",
    destination: hotel && !flight
      ? "في أي مدينة تريد الإقامة؟"
      : "ما هي وجهة السفر؟",
    departDate: hotel
      ? "ما تاريخ *الدخول* للفندق؟ (مثال: 2026-09-15)"
      : "ما تاريخ *المغادرة*؟ (مثال: 2026-09-15)",
    returnDate: flight && hotel
      ? "ما تاريخ *العودة* من الرحلة و*المغادرة* من الفندق؟"
      : hotel
        ? "ما تاريخ *المغادرة* من الفندق؟"
        : "ما تاريخ *العودة*؟ (اختياري — اكتب «ذهاب فقط» إن لم تحتج عودة)",
    adults: "كم عدد *البالغين* (أو الأشخاص)؟",
    rooms: "كم عدد *الغرف*؟",
    children: "هل يوجد أطفال؟ إن نعم كم عددهم؟",
  };

  return questions[slot] ?? "هل يمكنك توضيح تفاصيل الرحلة؟";
}

export function buildInquirySummary(fields: TravelInquiryFields): string {
  const parts: string[] = [];
  const types = fields.serviceTypes;
  if (hasExplicitServiceTypes(types)) {
    if (wantsFlight(types) && wantsHotel(types)) {
      parts.push("الخدمة: طيران وفنادق");
    } else if (wantsHotel(types)) {
      parts.push("الخدمة: فنادق");
    } else if (wantsFlight(types)) {
      parts.push("الخدمة: طيران");
    } else if (types?.[0]) {
      parts.push(`الخدمة: ${types[0]}`);
    }
  }
  if (fields.origin) parts.push(`مغادرة: ${fields.origin}`);
  if (fields.destination) parts.push(`وجهة: ${fields.destination}`);
  if (fields.preferredHotel) parts.push(`فندق: ${fields.preferredHotel}`);
  if (fields.departDate) {
    parts.push(wantsHotel(types) ? `دخول: ${fields.departDate}` : `ذهاب: ${fields.departDate}`);
  }
  if (fields.returnDate) {
    parts.push(wantsHotel(types) ? `مغادرة فندق: ${fields.returnDate}` : `عودة: ${fields.returnDate}`);
  }
  if (fields.adults) parts.push(`بالغون: ${fields.adults}`);
  if (fields.rooms) parts.push(`غرف: ${fields.rooms}`);
  if (fields.children) parts.push(`أطفال: ${fields.children}`);
  if (fields.cabinClass) parts.push(`درجة: ${fields.cabinClass}`);
  return parts.filter(Boolean).join(" · ");
}

export function parseRelativeDate(text: string, now = new Date()): string | undefined {
  const t = text.trim().toLowerCase();
  const base = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
  );

  function addDays(days: number) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  if (/(?:غدا|غداً|بكرة|tomorrow)/i.test(t)) return addDays(1);
  if (/(?:بعد غد|بعد\s*غدا)/i.test(t)) return addDays(2);
  if (/(?:الاسبوع|الأسبوع)\s*(?:الجاي|القادم)|next week/i.test(t)) {
    return addDays(7);
  }
  if (/(?:نهاية\s*الاسبوع|نهاية\s*الأسبوع|weekend)/i.test(t)) {
    const day = base.getUTCDay();
    const daysUntilFriday = ((5 - day + 7) % 7) || 7;
    return addDays(daysUntilFriday);
  }

  const inDays = t.match(/(?:بعد|within|in)\s*(\d+)\s*(?:يوم|days?)/i);
  if (inDays?.[1]) return addDays(Number(inDays[1]));

  return undefined;
}

function normalizeDateParts(day: string, month: string, year: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Parse «من 10/9/2026 إلى 15/9/2026» and ISO pairs in one message. */
export function parseDateRange(text: string): {
  checkIn?: string;
  checkOut?: string;
} {
  const isoPair = text.match(
    /(\d{4}-\d{2}-\d{2})\s*(?:إلى|الى|إلي|to|–|-|—)\s*(\d{4}-\d{2}-\d{2})/i,
  );
  if (isoPair) {
    return { checkIn: isoPair[1], checkOut: isoPair[2] };
  }

  const dmyPair = text.match(
    /(?:من|from)?\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\s*(?:إلى|الى|إلي|to|حتى|until|–|-|—)\s*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})/i,
  );
  if (dmyPair) {
    return {
      checkIn: normalizeDateParts(dmyPair[1]!, dmyPair[2]!, dmyPair[3]!),
      checkOut: normalizeDateParts(dmyPair[4]!, dmyPair[5]!, dmyPair[6]!),
    };
  }

  const between = text.match(
    /(?:بين|between)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})\s*(?:و|and)\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]20\d{2})/i,
  );
  if (between) {
    const a = parseSingleDateToken(between[1]!);
    const b = parseSingleDateToken(between[2]!);
    if (a && b) return { checkIn: a, checkOut: b };
  }

  return {};
}

export function parseSingleDateToken(token: string): string | undefined {
  const iso = token.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso?.[1]) return iso[1];
  const dmy = token.match(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})\b/);
  if (dmy) {
    return normalizeDateParts(dmy[1]!, dmy[2]!, dmy[3]!);
  }
  return parseRelativeDate(token);
}

export function parseRoomsCount(text: string): number | undefined {
  const m1 = text.match(/(\d+)\s*(?:غرف(?:ة|ات)?|rooms?)/i);
  if (m1?.[1]) return Math.max(1, Number(m1[1]));
  const m2 = text.match(/(?:غرف(?:ة|ات)?|rooms?)\s*[:=]?\s*(\d+)/i);
  if (m2?.[1]) return Math.max(1, Number(m2[1]));
  return undefined;
}

export function parsePeopleCount(text: string): number | undefined {
  const m1 = text.match(/(\d+)\s*(?:شخص|أشخاص|بالغ|بالغين|persons?|people|pax)/i);
  if (m1?.[1]) return Math.max(1, Number(m1[1]));
  const m2 = text.match(/(?:عدد\s*)?(?:الأشخاص|المسافرين|البالغين)\s*[:=]?\s*(\d+)/i);
  if (m2?.[1]) return Math.max(1, Number(m2[1]));
  return undefined;
}

export function parsePreferredHotel(text: string): string | undefined {
  const named = text.match(
    /(?:فندق|hotel)\s+([A-Za-z\u0600-\u06FF0-9][A-Za-z\u0600-\u06FF0-9\s\-'.]{1,60})/i,
  );
  if (named?.[1]) return named[1].trim();
  return undefined;
}
