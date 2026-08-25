import type { ServiceType } from "@watesly-travel/shared";

export const SERVICE_TYPE_CLARIFY_QUESTION =
  "هل تريد تذاكر طيران، فنادق، أم طيران وفنادق؟";

const FLIGHT_RE =
  /(?:طيران|تذك(?:ير|ار(?:ة|ات)?)|رحل(?:ة|ات)|✈|flight|ticket|tickets|airfare)/i;
const HOTEL_RE =
  /(?:فند(?:ق|اق)|فنادق|إقام(?:ة|ات)|🏨|hotel|hotels|stay|accommodation)/i;
const BOTH_RE =
  /(?:كلاهما|الاثن(?:ين|ان)|طيران\s*(?:و|\+|مع)\s*فنادق|فنادق\s*(?:و|\+|مع)\s*طيران|باق(?:ة|ات)|package|both|flights?\s+and\s+hotels?)/i;
const TRANSFER_RE = /(?:نقل|مواصلات|transfer|transfers)/i;

/** Short replies when the assistant just asked what service type is needed. */
const FLIGHT_ONLY_REPLY =
  /^(?:1|[\u0661]|طيران|تذاكر(?:\s+طيران)?|رح(?:لة|لات)|flight|flights?|tickets?)$/i;
const HOTEL_ONLY_REPLY =
  /^(?:2|[\u0662]|فنادق|فندق|إقام(?:ة|ات)|hotel|hotels?|stay)$/i;
const BOTH_REPLY =
  /^(?:3|[\u0663]|كلاهما|الاثن(?:ين|ان)|طيران\s*(?:و|\+)\s*فنادق|فنادق\s*(?:و|\+)\s*طيران|both|package|باق(?:ة|ات))$/i;

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

export function mergeServiceTypes(
  messageText: string,
  current?: ServiceType[] | null,
): ServiceType[] | null | undefined {
  const parsed = parseServiceTypesFromText(messageText);
  if (parsed) return parsed;
  if (hasExplicitServiceTypes(current)) return current!;
  return null;
}
