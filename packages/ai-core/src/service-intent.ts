import type { ServiceType } from "@watesly-travel/shared";

export const SERVICE_TYPE_CLARIFY_QUESTION =
  "هل تريد تذاكر *طيران* فقط، *طيران وفنادق*، أم *فنادق* فقط؟";

const CITY_LABELS: Record<string, string> = {
  DXB: "دبي",
  KWI: "الكويت",
  RUH: "الرياض",
  JED: "جدة",
  CAI: "القاهرة",
  DOH: "الدوحة",
  IST: "إسطنbul",
  LHR: "لندن",
  CDG: "باريس",
};

/** Generic «travel to X» without saying flights or hotels — service type is unknown. */
const VAGUE_TRAVEL_ONLY_RE =
  /(?:أريد|ابي|أبي|حاب|حابب|بدي|want\s+to)\s*(?:أ)?(?:سافر|روح|سفر)|(?:سفر|رحلة)\s*(?:إلى|الى|إلي|to)|travel\s+to|trip\s+to/i;

export const HOTEL_UPSELL_PROMPT =
  "🏨 هل تريد البحث عن فنادق في الوجهة أيضاً؟\n• اكتب «ابحث عن فنادق» لعرض خيارات\n• أو اذكر *اسم فندق* معيّن لمعرفة أسعاره";

const FLIGHT_RE =
  /(?:طيران|تذك(?:ير|ار(?:ة|ات)?)|رحل(?:ة|ات)|✈|flight|ticket|tickets|airfare)/i;
const HOTEL_RE =
  /(?:فند(?:ق|اق)|فنادق|إقام(?:ة|ات)|🏨|hotel|hotels|stay|accommodation)/i;
const BOTH_RE =
  /(?:كلاهما|الاثن(?:ين|ان)|طيران\s*(?:و|\+|مع)\s*فنادق|فنادق\s*(?:و|\+|مع)\s*طيران|باق(?:ة|ات)|package|both|flights?\s+and\s+hotels?)/i;
const TRANSFER_RE = /(?:نقل|مواصلات|transfer|transfers)/i;
const ROUTE_RE = /من\s+\S+\s+(?:إلى|الى|إلي|to)\s+\S+/i;
const ROOMS_RE = /(?:\d+\s*(?:غرف|غرفة|rooms?)|(?:غرف|غرفة|rooms?)\s*[:=]?\s*\d+)/i;
const STAY_RANGE_RE =
  /(?:من|from|check[\s-]?in|دخول|تاريخ\s*الدخول).+(?:إلى|الى|إلي|to|until|حتى|check[\s-]?out|مغادرة)/i;

/** Short replies when the assistant just asked what service type is needed. */
const FLIGHT_ONLY_REPLY =
  /^(?:1|[\u0661]|طيران|تذاكر(?:\s+طيران)?|رح(?:لة|لات)|flight|flights?|tickets?)$/i;
const HOTEL_ONLY_REPLY =
  /^(?:2|[\u0662]|فنادق|فندق|إقام(?:ة|ات)|hotel|hotels?|stay)$/i;
const BOTH_REPLY =
  /^(?:3|[\u0663]|كلاهما|الاثن(?:ين|ان)|طيران\s*(?:و|\+)\s*فنادق|فنادق\s*(?:و|\+)\s*طيران|both|package|باق(?:ة|ات))$/i;

export const HOTEL_SEARCH_YES_RE =
  /(?:ابحث\s*(?:لي\s*)?عن\s*فنادق|فنادق\s*في|أريد\s*فنادق|نعم.*فندق|yes.*hotel|search\s*hotels?)/i;

export function hasExplicitServiceTypes(types: ServiceType[] | null | undefined) {
  return Array.isArray(types) && types.length > 0;
}

/**
 * Infer flight/hotel/both/transfer from the latest user message.
 * Returns `null` when the message does not clarify service type.
 */
export function parseServiceTypesFromText(
  text: string,
): ServiceType[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (BOTH_REPLY.test(trimmed) || BOTH_RE.test(trimmed)) {
    return ["flight", "hotel"];
  }
  if (FLIGHT_ONLY_REPLY.test(trimmed)) {
    return ["flight"];
  }
  if (HOTEL_ONLY_REPLY.test(trimmed)) {
    return ["hotel"];
  }
  if (TRANSFER_RE.test(trimmed) && !FLIGHT_RE.test(trimmed) && !HOTEL_RE.test(trimmed)) {
    return ["transfer"];
  }

  const wantsFlight = FLIGHT_RE.test(trimmed);
  const wantsHotel = HOTEL_RE.test(trimmed);

  if (wantsFlight && wantsHotel) return ["flight", "hotel"];
  if (wantsHotel) return ["hotel"];
  if (wantsFlight) return ["flight"];

  return null;
}

/** Infer service type only when the message is explicit — not from «أريد السفر إلى دبي» alone. */
export function inferServiceTypesFromMessage(text: string): ServiceType[] | null {
  const hasHotelCue = HOTEL_RE.test(text);
  const hasFlightCue = FLIGHT_RE.test(text);
  const hasRoute = ROUTE_RE.test(text);
  const hasStayShape = STAY_RANGE_RE.test(text) || ROOMS_RE.test(text);

  const vagueTravelOnly =
    VAGUE_TRAVEL_ONLY_RE.test(text) &&
    !hasFlightCue &&
    !hasHotelCue &&
    !hasStayShape;

  if (vagueTravelOnly) {
    return null;
  }

  if (hasHotelCue && hasFlightCue) return ["flight", "hotel"];
  if (hasHotelCue || (hasStayShape && !hasRoute)) return ["hotel"];
  if (hasFlightCue || hasRoute) return ["flight"];
  return null;
}

export function destinationDisplayLabel(codeOrName?: string | null): string {
  if (!codeOrName) return "";
  const upper = codeOrName.toUpperCase();
  return CITY_LABELS[upper] || codeOrName;
}

/** Ask flight vs hotel when destination is known but intent is not. */
export function serviceTypeClarifyQuestion(destination?: string | null): string {
  const place = destinationDisplayLabel(destination);
  if (place) {
    return (
      `تمام — الوجهة *${place}*.\n` +
      "ماذا تريد بالتحديد؟\n" +
      "1️⃣ *تذاكر طيران* فقط\n" +
      "2️⃣ *طيران وفنادق*\n" +
      "3️⃣ *فنادق* فقط"
    );
  }
  return SERVICE_TYPE_CLARIFY_QUESTION;
}

export function mergeServiceTypes(
  messageText: string,
  current?: ServiceType[] | null,
): ServiceType[] | null | undefined {
  const parsed = parseServiceTypesFromText(messageText);
  if (parsed) return parsed;

  const inferred = inferServiceTypesFromMessage(messageText);
  if (inferred) return inferred;

  if (hasExplicitServiceTypes(current)) return current!;
  return null;
}
