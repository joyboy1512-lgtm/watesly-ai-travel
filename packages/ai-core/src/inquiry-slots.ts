import type { ServiceType, TravelInquiryFields } from "@watesly-travel/shared";
import { SERVICE_TYPE_CLARIFY_QUESTION, hasExplicitServiceTypes } from "./service-intent";

export type InquirySlot =
  | "serviceTypes"
  | "origin"
  | "destination"
  | "departDate"
  | "returnDate"
  | "adults"
  | "children";

export function wantsFlight(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("flight"));
}

export function wantsHotel(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("hotel"));
}

export function wantsTransfer(types: ServiceType[] | null | undefined) {
  return Boolean(types?.includes("transfer"));
}

/** Fields still needed before search — one question at a time via [0]. */
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
        : "ما تاريخ *العودة*؟ (اتركه فارغاً إن كانت ذهاباً فقط)",
    adults: "كم عدد *البالغين*؟",
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
  if (fields.departDate) {
    parts.push(wantsHotel(types) ? `دخول: ${fields.departDate}` : `ذهاب: ${fields.departDate}`);
  }
  if (fields.returnDate) {
    parts.push(wantsHotel(types) ? `مغادرة فندق: ${fields.returnDate}` : `عودة: ${fields.returnDate}`);
  }
  if (fields.adults) parts.push(`بالغون: ${fields.adults}`);
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
