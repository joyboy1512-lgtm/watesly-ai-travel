/** Rich hotel display model — provider-agnostic UI shape. */

import { normalizeBoardLabelAr, normalizePaymentTypeAr } from "./provider-content-ar";

export type HotelBoardCode =
  | "RO"
  | "BB"
  | "HB"
  | "FB"
  | "AI"
  | "SC"
  | "DB"
  | string;

export type HotelDailyRate = {
  offset?: number;
  date?: string;
  net?: number;
};

export type HotelRateOption = {
  rateKey: string;
  rateType: string;
  rateClass?: string;
  roomCode: string;
  roomName: string;
  boardCode: string;
  boardName: string;
  /**
   * Stay total in MAJOR currency units (not minor, not per-night).
   * Hotelbeds `net` is the full-stay amount for the requested occupancy.
   */
  net: number;
  /** Explicit basis — defaults to "stay" when omitted. */
  netBasis?: "stay" | "night";
  sellingRate?: number;
  currency: string;
  paymentType?: string;
  packaging?: boolean;
  allotment?: number;
  freeCancellation: boolean;
  cancellationPolicies: Array<{
    amount: number;
    currency: string;
    from: string;
  }>;
  taxes?: {
    allIncluded?: boolean;
    items: Array<{
      type?: string;
      amount: number;
      currency: string;
      included: boolean;
    }>;
  };
  promotions: Array<{ code?: string; name?: string; remark?: string }>;
  adults?: number;
  children?: number;
  rooms?: number;
  rateCommentsId?: string;
  rateComments?: string;
  dailyRates?: HotelDailyRate[];
  /** Set after WeekendGate aggregation when several suppliers cover the same hotel. */
  sourceProvider?: string;
  sourceProviderLabel?: string;
  sourceHotelCode?: string;
};

export type HotelRoomOccupancy = {
  minPax?: number;
  maxPax?: number;
  maxAdults?: number;
  maxChildren?: number;
};

export type HotelRoomOption = {
  code: string;
  name: string;
  rates: HotelRateOption[];
  imageUrl?: string;
  images?: string[];
  facilities?: string[];
  description?: string;
  occupancy?: HotelRoomOccupancy;
  /** Square metres when Hotelbeds content sends a numeric room-size facility. */
  sizeSqm?: number;
};

export type HotelImageRef = {
  url: string;
  roomCode?: string;
  type?: string;
};

export type HotelPoiDistance = {
  nameAr: string;
  km: number;
  label: string;
};

export type HotelPropertyDetails = {
  provider: string;
  liveMode: boolean;
  hotelCode: string;
  name: string;
  nameEn?: string;
  stars?: number;
  categoryCode?: string;
  categoryName?: string;
  destinationCode?: string;
  destinationName?: string;
  zoneCode?: string;
  zoneName?: string;
  location?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  currency: string;
  minRate?: number;
  maxRate?: number;
  nights: number;
  checkInDate: string;
  checkOutDate: string;
  /** Cheapest rate summary for list cards */
  board?: string;
  boardCode?: string;
  roomType?: string;
  roomCode?: string;
  rateType?: string;
  paymentType?: string;
  freeCancellation?: boolean;
  noPrepayment?: boolean;
  /** Full tree from provider */
  rooms: HotelRoomOption[];
  rateOptions: HotelRateOption[];
  boards: string[];
  boardCodes: HotelBoardCode[];
  paymentTypes: string[];
  rateTypes: string[];
  zones: string[];
  promotions: string[];
  /** Content API */
  description?: string;
  images?: HotelImageRef[];
  roomImages?: Record<string, string>;
  facilityLabels?: string[];
  ranking?: number;
  /** Official guest review score — only when provider supplies a real source. */
  guestRatingScore?: number;
  guestRatingScale?: 5 | 10;
  guestReviewCount?: number;
  guestRatingSource?: string;
  distanceToCenterKm?: number;
  distanceToCenterLabel?: string;
  poiDistances?: HotelPoiDistance[];
  mapUrl?: string;
  fetchedAt?: string;
  source?: "hotelbeds-sandbox" | "hotelbeds-live" | "mock" | string;
  sourceLabel?: string;
  /** Legacy/mock fields */
  rating?: number;
  reviewCount?: number;
  facilities?: string[];
  propertyType?: string;
  imageUrl?: string;
  roomsAvailable?: number;
  scenario?: string;
  [key: string]: unknown;
};

export const BOARD_LABELS_AR: Record<string, string> = {
  RO: "غرفة فقط",
  BB: "شامل الإفطار",
  HB: "نصف إقامة",
  FB: "إقامة كاملة",
  AI: "شامل جميع الوجبات",
  SC: "خدمة ذاتية",
  DB: "إفطار وعشاء",
};

export function boardLabelAr(code?: string, name?: string): string {
  if (code && BOARD_LABELS_AR[code]) return BOARD_LABELS_AR[code];
  const fromCentral = normalizeBoardLabelAr(code || name).ar;
  if (fromCentral && fromCentral !== (code || name)) return fromCentral;
  if (name?.trim()) return name.trim();
  return code || "—";
}

export function paymentTypeLabelAr(type?: string): string {
  const ar = normalizePaymentTypeAr(type).ar;
  return ar || type || "—";
}

export function taxTypeLabelAr(type?: string): string {
  const key = String(type || "").toUpperCase();
  if (key === "TAX") return "ضريبة";
  if (key === "FEE") return "رسوم";
  if (key === "VAT" || key === "IVA") return "ضريبة قيمة مضافة";
  if (key === "CITYTAX" || key === "CITY") return "ضريبة بلدية";
  return type || "رسوم/ضريبة";
}

export type HotelPropertyTypeId = "hotel" | "apartment" | "resort" | "guest_house";

/** Infer stay type from Hotelbeds category / name when the mapper left it as "hotel". */
export function inferHotelPropertyType(input: {
  propertyType?: string | null;
  categoryCode?: string | null;
  categoryName?: string | null;
  name?: string | null;
  nameEn?: string | null;
}): HotelPropertyTypeId {
  const explicit = String(input.propertyType || "")
    .trim()
    .toLowerCase();
  if (
    explicit === "apartment" ||
    explicit === "resort" ||
    explicit === "guest_house"
  ) {
    return explicit;
  }
  const blob = [input.categoryCode, input.categoryName, input.name, input.nameEn]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (/apart|apth|aparthotel|studio|شقق|شقة/.test(blob)) return "apartment";
  if (/resort|منتجع/.test(blob)) return "resort";
  if (
    /guest\s*house|guesthouse|hostel|riad|villa|motel|\bghs\b|بيت ضيافة|دار ضيافة|نزل|استراحة/.test(
      blob,
    )
  ) {
    return "guest_house";
  }
  return "hotel";
}

/** Same board, stay total, pay/cancel terms — Hotelbeds often repeats this twice for 2 rooms. */
export function hotelRateOfferFingerprint(rate: HotelRateOption): string {
  const net = Math.round(Number(rate.net || 0) * 1000) / 1000;
  const from = rate.cancellationPolicies?.[0]?.from || "";
  return [
    String(rate.boardCode || "").toUpperCase(),
    net,
    String(rate.paymentType || ""),
    rate.freeCancellation ? "1" : "0",
    from,
    Number(rate.adults || 0),
    Number(rate.children || 0),
    Number(rate.rooms || 1),
  ].join("|");
}

export function pickPreferredHotelRate(a: HotelRateOption, b: HotelRateOption): HotelRateOption {
  const bookable = (r: HotelRateOption) => String(r.rateType || "").toUpperCase() === "BOOKABLE";
  if (bookable(a) !== bookable(b)) return bookable(a) ? a : b;
  const allotA = Number(a.allotment || 0);
  const allotB = Number(b.allotment || 0);
  if (allotA !== allotB) return allotA > allotB ? a : b;
  return a;
}

export function dedupeHotelRates(rates: HotelRateOption[]): HotelRateOption[] {
  const byKey = new Map<string, HotelRateOption>();
  for (const rate of rates) {
    const key = String(rate.rateKey || "").trim();
    if (!key) continue;
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickPreferredHotelRate(prev, rate) : rate);
  }
  const byOffer = new Map<string, HotelRateOption>();
  for (const rate of byKey.values()) {
    const fp = hotelRateOfferFingerprint(rate);
    const prev = byOffer.get(fp);
    byOffer.set(fp, prev ? pickPreferredHotelRate(prev, rate) : rate);
  }
  return [...byOffer.values()].sort((a, b) => a.net - b.net);
}

export function mergeHotelRoomsByCode(rooms: HotelRoomOption[]): HotelRoomOption[] {
  const map = new Map<string, HotelRoomOption>();
  for (const room of rooms) {
    const key = String(room.code || room.name || "").trim().toUpperCase();
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...room, rates: [...(room.rates || [])] });
      continue;
    }
    map.set(key, {
      ...prev,
      name: prev.name || room.name,
      imageUrl: prev.imageUrl || room.imageUrl,
      images: [...new Set([...(prev.images || []), ...(room.images || [])])],
      facilities: [...new Set([...(prev.facilities || []), ...(room.facilities || [])])],
      description: prev.description || room.description,
      occupancy: prev.occupancy || room.occupancy,
      sizeSqm: prev.sizeSqm ?? room.sizeSqm,
      rates: [...prev.rates, ...(room.rates || [])],
    });
  }
  return [...map.values()]
    .map((room) => ({ ...room, rates: dedupeHotelRates(room.rates) }))
    .filter((room) => room.rates.length > 0)
    .sort((a, b) => (a.rates[0]?.net ?? Infinity) - (b.rates[0]?.net ?? Infinity));
}
