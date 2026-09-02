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
