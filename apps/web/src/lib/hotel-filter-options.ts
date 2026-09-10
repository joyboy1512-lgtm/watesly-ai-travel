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
  { id: "wifi", label: "واي فاي مجاني" },
  { id: "parking", label: "موقف سيارات" },
  { id: "accessibility", label: "مهيأ لذوي الإعاقة" },
] as const;

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
] as const;

export const BED_TYPE_OPTIONS = [
  { id: "double", label: "سرير مزدوج", keywords: ["double", "مزدوج", "king", "queen"] },
  { id: "twin", label: "سريرين توأمين", keywords: ["twin", "توأم", "سريرين"] },
] as const;

export const BRAND_PATTERNS = [
  { id: "holiday-inn", label: "فنادق ومنتجعات هوليداي إن", patterns: ["holiday inn"] },
  { id: "ibis", label: "إيبيس", patterns: ["ibis"] },
  { id: "millennium", label: "فنادق ميلينيوم", patterns: ["millennium"] },
  { id: "hyatt", label: "جراند حياة", patterns: ["hyatt", "grand hyatt"] },
  { id: "best-western", label: "بست ويسترن بلس", patterns: ["best western"] },
  { id: "crowne-plaza", label: "فنادق ومنتجعات كراون بلازا", patterns: ["crowne plaza"] },
  { id: "courtyard", label: "كورتيارد باي ماريوت", patterns: ["courtyard"] },
  { id: "jw-marriott", label: "فنادق ومنتجعات جيه دبليو ماريوت", patterns: ["jw marriott"] },
  { id: "residence-inn", label: "ريزيدنس إن", patterns: ["residence inn"] },
  { id: "jumeirah", label: "جميرا", patterns: ["jumeirah"] },
] as const;

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

export function hotelHasBoard(h: HotelLike, boardId: string): boolean {
  const codes = new Set(rateOptionsOf(h).map((r) => String(r.boardCode || "")));
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
  const labels = hotelFacilityLabels(h).join(" ").toLowerCase();
  const blob = hotelTextBlob(h);
  const keywords: Record<string, string[]> = {
    pool: ["pool", "مسبح", "swimming"],
    wifi: ["wifi", "wi-fi", "واي فاي", "internet"],
    parking: ["parking", "موقف", "garage"],
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
    hot_tub: ["jacuzzi", "hot tub", "جاكوزي", "حوض ساخن", "حوض استحمام ساخن"],
    indoor_pool: ["indoor pool", "مسبح داخلي", "مسبح مغطى"],
    sauna: ["sauna", "ساونا"],
  };
  return (keywords[facilityId] || []).some((k) => labels.includes(k) || blob.includes(k));
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
  return rateOptionsOf(h).some((r) => r.freeCancellation);
}

export function hotelHasNoPrepayment(h: HotelLike): boolean {
  if (h.details.noPrepayment) return true;
  return rateOptionsOf(h).some((r) => r.paymentType === "AT_HOTEL");
}

export function hotelHasOnlinePayment(h: HotelLike): boolean {
  return rateOptionsOf(h).some((r) => r.paymentType === "AT_WEB");
}

export function hotelHasBreakfastRate(h: HotelLike): boolean {
  return rateOptionsOf(h).some((r) => ["BB", "HB", "FB", "AI"].includes(r.boardCode));
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
