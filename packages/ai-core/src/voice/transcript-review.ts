/**
 * Decide whether the client should confirm the transcript before AssistantService.
 * Search-like or ambiguous travel requests → confirm first.
 */

export type TranscriptReview = {
  needsConfirm: boolean;
  reason:
    | "search_intent"
    | "unclear_slots"
    | "low_confidence"
    | "empty"
    | "clear_chitchat";
  unclearSlots: string[];
};

const SEARCH_RE =
  /(طيران|رحلة|تذكرة|فندق|فنادق|إقامة|احجز|حجز|بحث|أسعار|من\s+\S+\s+(إلى|الى)|flight|hotel|book|search)/i;

const CITY_HINT =
  /(دبي|أبوظبي|الشارقة|الرياض|جدة|القاهرة|إسطنبول|اسطنبول|الكويت|بيروت|الدوحة|مسقط|DXB|AUH|KWI|CAI|IST|RUH|JED)/i;

const DATE_HINT =
  /(20\d{2}-\d{2}-\d{2}|\d{1,2}[\/.\-]\d{1,2}|غدا|بكرة|الأسبوع|الشهر|يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/i;

const PAX_HINT = /(بالغ|بالغين|مسافر|مسافرين|طفل|أطفال|شخص|شخصين|\d+\s*(شخص|بالغ))/i;

export function reviewTranscript(text: string, unclearAudio = false): TranscriptReview {
  const t = String(text || "").trim();
  if (!t || unclearAudio) {
    return {
      needsConfirm: true,
      reason: unclearAudio ? "low_confidence" : "empty",
      unclearSlots: [],
    };
  }

  const searchLike = SEARCH_RE.test(t);
  if (!searchLike) {
    return { needsConfirm: false, reason: "clear_chitchat", unclearSlots: [] };
  }

  const unclearSlots: string[] = [];
  if (!CITY_HINT.test(t)) unclearSlots.push("city");
  // If only one city-ish mention for flights, still ask for full route later via assistant
  if (!DATE_HINT.test(t)) unclearSlots.push("date");
  if (!PAX_HINT.test(t)) unclearSlots.push("travelers");

  if (unclearSlots.length > 0) {
    return { needsConfirm: true, reason: "unclear_slots", unclearSlots };
  }

  return { needsConfirm: true, reason: "search_intent", unclearSlots: [] };
}
