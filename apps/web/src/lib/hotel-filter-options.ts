import { inferHotelPropertyType } from "@watesly-travel/shared";

type HotelLike = {
  description: string;
  details: Record<string, unknown>;
};

export type FilterCountOption = {
  id: string;
  label: string;
  count: number;
};

export const MEAL_FILTER_OPTIONS = [
  { id: "BB", label: "شامل الإفطار" },
  { id: "HB", label: "شامل إفطار وعشاء" },
  { id: "FB", label: "شامل لجميع الوجبات" },
  { id: "AI", label: "شامل كلياً" },
  { id: "RO", label: "إعداد الوجبات ذاتياً" },
  { id: "SC", label: "خدمة ذاتية" },
] as const;

export const PROPERTY_TYPE_OPTIONS = [
  { id: "hotel", label: "الفنادق" },
  { id: "apartment", label: "الشقق" },
  { id: "resort", label: "المنتجعات" },
  { id: "guest_house", label: "بيوت وشقق لك بالكامل" },
] as const;

export const FACILITY_OPTIONS = [
  { id: "pool", label: "مسبح" },
  { id: "indoor_pool", label: "مسبح داخلي" },
  { id: "wifi", label: "واي فاي مجاني" },
  { id: "parking", label: "موقف سيارات" },
  { id: "accessibility", label: "مهيأ لذوي الإعاقة" },
  { id: "gym", label: "مركز للياقة البدنية" },
  { id: "spa", label: "سبا" },
  { id: "restaurant", label: "مطعم" },
  { id: "bar", label: "بار" },
  { id: "airport_shuttle", label: "نقل المطار" },
  { id: "reception_24h", label: "استقبال 24 ساعة" },
  { id: "elevator", label: "مصعد" },
  { id: "ac", label: "تكييف" },
  { id: "beach", label: "شاطئ" },
  { id: "kids_club", label: "نادي أطفال" },
  { id: "room_service", label: "خدمة الغرف" },
  { id: "hot_tub", label: "حوض استحمام ساخن" },
  { id: "sauna", label: "ساونا" },
  { id: "laundry", label: "خدمة غسيل" },
] as const;

export const FACILITY_KEYWORDS: Record<string, string[]> = {
  pool: ["pool", "مسبح", "swimming"],
  indoor_pool: ["indoor pool", "مسبح داخلي", "مسبح مغطى"],
  wifi: ["wifi", "wi-fi", "واي فاي", "internet", "إنترنت"],
  parking: ["parking", "موقف", "garage", "car park"],
  accessibility: [
    "wheelchair",
    "accessible",
    "disability",
    "disabled",
    "إعاقة",
    "ذوي الإعاقة",
    "كراسي متحركة",
    "مهيأ",
  ],
  gym: ["gym", "fitness", "نادي رياضي", "لياقة", "صالة رياضية"],
  spa: ["spa", "سبا", "wellness"],
  restaurant: ["restaurant", "مطعم"],
  bar: ["bar", "بار", "lounge"],
  airport_shuttle: ["airport shuttle", "airport transfer", "نقل المطار", "shuttle"],
  reception_24h: ["24-hour", "24 hour", "24h", "استقبال 24"],
  elevator: ["elevator", "lift", "مصعد"],
  ac: ["air conditioning", "air-condition", "a/c", "مكيف", "تكييف"],
  beach: ["beach", "شاطئ"],
  kids_club: ["kids club", "children's club", "نادي أطفال"],
  room_service: ["room service", "خدمة الغرف"],
  hot_tub: ["jacuzzi", "hot tub", "جاكوزي", "حوض ساخن", "حوض استحمام ساخن"],
  sauna: ["sauna", "ساونا"],
  laundry: ["laundry", "غسيل", "laundry service"],
};

/** @deprecated kept for any legacy callers — shop UI uses FACILITY_OPTIONS */
export const LEGACY_FACILITY_OPTIONS = [
  { id: "pool", label: "مسبح" },
  { id: "parking", label: "موقف سيارات" },
  { id: "wifi", label: "واي فاي مجاني" },
  { id: "hot_tub", label: "حوض استحمام ساخن" },
  { id: "spa", label: "مركز السبا والعناية بالصحة" },
  { id: "gym", label: "مركز للياقة البدنية" },
  { id: "indoor_pool", label: "مسبح داخلي" },
  { id: "sauna", label: "ساونا" },
] as const;

export const ROOM_FACILITY_OPTIONS = [
  { id: "private_bathroom", label: "حمام خاص", keywords: ["حمام", "bathroom"] },
  { id: "ac", label: "مكيف هواء", keywords: ["مكيف", "air conditioning", "a/c"] },
  { id: "balcony", label: "شرفة", keywords: ["شرفة", "balcony", "تراس"] },
  { id: "private_pool", label: "مسبح خاص", keywords: ["مسبح خاص", "private pool"] },
  { id: "sea_view", label: "إطلالة على البحر", keywords: ["بحر", "sea view", "ocean"] },
] as const;

export const STAR_RATING_OPTIONS = [
  { id: "1", label: "نجمة واحدة" },
  { id: "2", label: "نجمتان" },
  { id: "3", label: "3 نجوم" },
  { id: "4", label: "4 نجوم" },
  { id: "5", label: "5 نجوم" },
] as const;

export const REVIEW_SCORE_OPTIONS = [
  { id: "9", label: "ممتاز: +9" },
  { id: "8", label: "جيد جداً: +8" },
  { id: "7", label: "جيد: +7" },
  { id: "6", label: "مرضي: +6" },
] as const;

export const DISTANCE_OPTIONS = [
  { id: "1", label: "أقل من كيلومتر واحد", maxKm: 1 },
  { id: "3", label: "أقل من 3 كلم", maxKm: 3 },
  { id: "5", label: "أقل من 5 كلم", maxKm: 5 },
  { id: "10", label: "أقل من 10 كلم", maxKm: 10 },
] as const;

export const BED_TYPE_OPTIONS = [
  { id: "double", label: "سرير مزدوج", keywords: ["double", "مزدوج", "king", "queen"] },
  { id: "twin", label: "سريرين توأمين", keywords: ["twin", "توأم", "سريرين"] },
] as const;

export const BRAND_PATTERNS = [
  { id: "holiday-inn", label: "فنادق ومنتجعات هوليداي إن", patterns: ["holiday inn"] },
  { id: "ibis", label: "إيبيس", patterns: ["ibis"] },
  { id: "novotel", label: "نوفوتيل", patterns: ["novotel"] },
  { id: "mercure", label: "ميركور", patterns: ["mercure"] },
  { id: "sofitel", label: "سوفوتيل", patterns: ["sofitel"] },
  { id: "millennium", label: "فنادق ميلينيوم", patterns: ["millennium"] },
  { id: "hyatt", label: "حياة", patterns: ["hyatt"] },
  { id: "hilton", label: "هيلتون", patterns: ["hilton"] },
  { id: "marriott", label: "ماريوت", patterns: ["marriott"] },
  { id: "sheraton", label: "شيراتون", patterns: ["sheraton"] },
  { id: "radisson", label: "راديسون", patterns: ["radisson"] },
  { id: "best-western", label: "بست ويسترن", patterns: ["best western"] },
  { id: "crowne-plaza", label: "كراون بلازا", patterns: ["crowne plaza"] },
  { id: "courtyard", label: "كورتيارد باي ماريوت", patterns: ["courtyard"] },
  { id: "jw-marriott", label: "جيه دبليو ماريوت", patterns: ["jw marriott"] },
  { id: "residence-inn", label: "ريزيدنس إن", patterns: ["residence inn"] },
  { id: "jumeirah", label: "جميرا", patterns: ["jumeirah"] },
  { id: "rotana", label: "روتانا", patterns: ["rotana"] },
  { id: "movenpick", label: "موفنبيك", patterns: ["movenpick", "mövenpick"] },
  { id: "intercontinental", label: "إنتركونتيننتال", patterns: ["intercontinental", "intercontinental"] },
  { id: "ramada", label: "رمادا", patterns: ["ramada"] },
] as const;

const FACILITY_LABEL_BLOCKED =
  /visa|master\s*card|mastercard|american\s*express|amex|number of floors|طوابق|credit card|بطاقة\s*ائتمان|payment|floors?/i;

function rateOptionsOf(h: HotelLike) {
  const raw = h.details.rateOptions;
  return Array.isArray(raw) ? raw : [];
}

function hotelFacilities(h: HotelLike): string[] {
  return Array.isArray(h.details.facilities) ? (h.details.facilities as string[]) : [];
}

function hotelFacilityLabels(h: HotelLike): string[] {
  return Array.isArray(h.details.facilityLabels)
    ? (h.details.facilityLabels as string[])
    : [];
}

function hotelTextBlob(h: HotelLike): string {
  const rooms = Array.isArray(h.details.rooms) ? h.details.rooms : [];
  const roomText = rooms
    .flatMap((room) => {
      const r = room as { name?: string; facilities?: string[]; rates?: Array<{ roomName?: string }> };
      return [
        r.name || "",
        ...(r.facilities || []),
        ...(r.rates || []).map((rate) => rate.roomName || ""),
      ];
    })
    .join(" ");
  return `${h.details.name || ""} ${h.description} ${roomText} ${hotelFacilityLabels(h).join(" ")}`.toLowerCase();
}

export function slugFacilityLabel(label: string): string {
  return label
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .slice(0, 48);
}

export function isBlockedFacilityLabel(label: string): boolean {
  return !label.trim() || FACILITY_LABEL_BLOCKED.test(label);
}

export function knownFacilityIdForLabel(label: string): string | null {
  const text = label.toLowerCase();
  for (const option of FACILITY_OPTIONS) {
    if ((FACILITY_KEYWORDS[option.id] || []).some((k) => text.includes(k.toLowerCase()))) {
      return option.id;
    }
  }
  return null;
}

export function hotelPropertyType(h: HotelLike): string {
  return inferHotelPropertyType({
    propertyType: h.details.propertyType != null ? String(h.details.propertyType) : "",
    categoryCode: h.details.categoryCode != null ? String(h.details.categoryCode) : "",
    categoryName: h.details.categoryName != null ? String(h.details.categoryName) : "",
    name: h.details.name != null ? String(h.details.name) : "",
    nameEn: h.details.nameEn != null ? String(h.details.nameEn) : "",
  });
}

export function hotelHasBoard(h: HotelLike, boardId: string): boolean {
  const codes = new Set(rateOptionsOf(h).map((r) => String((r as { boardCode?: string }).boardCode || "")));
  if (boardId === "RO") return codes.has("RO") || codes.size === 0;
  if (boardId === "SC") return codes.has("SC");
  if (boardId === "BB") return codes.has("BB") || codes.has("HB") || codes.has("FB") || codes.has("AI");
  if (boardId === "HB") return codes.has("HB") || codes.has("FB") || codes.has("AI");
  if (boardId === "FB") return codes.has("FB") || codes.has("AI");
  return codes.has(boardId);
}

export function hotelHasFacility(h: HotelLike, facilityId: string): boolean {
  const fac = hotelFacilities(h);
  if (fac.includes(facilityId)) return true;
  const labels = hotelFacilityLabels(h);
  if (labels.some((l) => slugFacilityLabel(l) === facilityId || l === facilityId)) return true;
  const keywords = FACILITY_KEYWORDS[facilityId];
  if (keywords?.length) {
    const hay = `${labels.join(" ")} ${hotelTextBlob(h)}`.toLowerCase();
    if (keywords.some((k) => hay.includes(k.toLowerCase()))) return true;
  }
  return false;
}

export function hotelHasRoomFacility(h: HotelLike, facilityId: string): boolean {
  const option = ROOM_FACILITY_OPTIONS.find((f) => f.id === facilityId);
  if (!option) return false;
  const text = hotelTextBlob(h);
  return option.keywords.some((k) => text.includes(k.toLowerCase()));
}

export function hotelBrandId(h: HotelLike): string | null {
  const name = `${h.details.name || ""} ${h.details.nameEn || ""}`.toLowerCase();
  for (const brand of BRAND_PATTERNS) {
    if (brand.patterns.some((p) => name.includes(p))) return brand.id;
  }
  return null;
}

export function hotelBedTypes(h: HotelLike): string[] {
  const text = hotelTextBlob(h);
  return BED_TYPE_OPTIONS.filter((b) =>
    b.keywords.some((k) => text.includes(k.toLowerCase())),
  ).map((b) => b.id);
}

export function hotelLandmarks(h: HotelLike): string[] {
  const poi = Array.isArray(h.details.poiDistances)
    ? (h.details.poiDistances as Array<{ nameAr: string }>)
    : [];
  return poi.map((p) => p.nameAr).filter(Boolean);
}

export function hotelDistanceKm(h: HotelLike): number | null {
  const km = Number(h.details.distanceToCenterKm);
  return Number.isFinite(km) && km >= 0 ? km : null;
}

export function hotelReviewScore(h: HotelLike): number {
  // Only real guest scores — never Hotelbeds ranking or synthetic rating.
  const n = Number(h.details.guestRatingScore ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function hotelHasFreeCancellation(h: HotelLike): boolean {
  if (h.details.freeCancellation) return true;
  return rateOptionsOf(h).some((r) => (r as { freeCancellation?: boolean }).freeCancellation);
}

export function hotelHasNoPrepayment(h: HotelLike): boolean {
  if (h.details.noPrepayment) return true;
  return rateOptionsOf(h).some((r) => (r as { paymentType?: string }).paymentType === "AT_HOTEL");
}

export function hotelHasOnlinePayment(h: HotelLike): boolean {
  return rateOptionsOf(h).some((r) => (r as { paymentType?: string }).paymentType === "AT_WEB");
}

export function hotelHasBreakfastRate(h: HotelLike): boolean {
  return rateOptionsOf(h).some((r) =>
    ["BB", "HB", "FB", "AI"].includes(String((r as { boardCode?: string }).boardCode || "")),
  );
}

export function countOptions<T extends { id: string; label: string }>(
  hotels: HotelLike[],
  options: readonly T[],
  match: (hotel: HotelLike, id: string) => boolean,
): FilterCountOption[] {
  return options
    .map((option) => ({
      id: option.id,
      label: option.label,
      count: hotels.filter((h) => match(h, option.id)).length,
    }))
    .filter((o) => o.count > 0);
}

export function collectExtraFacilityOptions(hotels: HotelLike[]): FilterCountOption[] {
  const extra = new Map<string, FilterCountOption>();
  for (const h of hotels) {
    const seenOnHotel = new Set<string>();
    for (const label of hotelFacilityLabels(h)) {
      if (isBlockedFacilityLabel(label)) continue;
      if (knownFacilityIdForLabel(label)) continue;
      const id = slugFacilityLabel(label);
      if (!id || seenOnHotel.has(id)) continue;
      seenOnHotel.add(id);
      const existing = extra.get(id);
      if (existing) existing.count += 1;
      else extra.set(id, { id, label: label.trim(), count: 1 });
    }
    for (const id of hotelFacilities(h)) {
      if (FACILITY_OPTIONS.some((o) => o.id === id) || seenOnHotel.has(id)) continue;
      seenOnHotel.add(id);
      const existing = extra.get(id);
      if (existing) existing.count += 1;
      else extra.set(id, { id, label: id, count: 1 });
    }
  }
  return [...extra.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
