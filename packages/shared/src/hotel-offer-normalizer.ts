/**
 * HotelOfferNormalizer — converts provider hotel payloads into a safe UI model.
 * Never expose raw Hotelbeds rateKey / secrets to public logs from this layer.
 */

import type { HotelPropertyDetails, HotelRateOption, HotelRoomOption } from "./hotel-display";
import { boardLabelAr, paymentTypeLabelAr } from "./hotel-display";
import type { MoneyMinor } from "./types";
import {
  buildHotelPriceBreakdown,
  sellMinorForStayNet,
  validateHotelSellPrice,
  type HotelNetBasis,
  type HotelPriceBreakdown,
  type HotelPriceRejectReason,
} from "./hotel-money";

export type NormalizedGuestRating = {
  score: number;
  scale: 5 | 10;
  reviewCount?: number;
  source: string;
} | null;

export type NormalizedHotelStars = {
  stars: number | null;
  categoryCode?: string;
  categoryName?: string;
  source: "category" | "unknown";
};

export type NormalizedRateCard = {
  rateKeyHash: string;
  roomCode: string;
  roomNameAr: string;
  roomNameOriginal?: string;
  boardCode: string;
  boardNameAr: string;
  freeCancellation: boolean;
  paymentType?: string;
  paymentLabelAr: string;
  allotment?: number;
  availabilityLabel: string;
  currency: string;
  /** Sell total for the stay in minor units (safe to display). */
  totalMinor: MoneyMinor;
  perNightMinor: MoneyMinor;
  taxesIncluded: boolean;
  excludedTaxMinor: MoneyMinor;
  breakdown: HotelPriceBreakdown;
  rejected?: { reason: HotelPriceRejectReason; detail: string };
};

export type NormalizedHotelOffer = {
  hotelCode: string;
  name: string;
  stars: NormalizedHotelStars;
  guestRating: NormalizedGuestRating;
  zoneName?: string;
  distanceToCenterLabel?: string;
  facilityLabels: string[];
  imageUrl?: string;
  currency: string;
  providerCurrency?: string;
  nights: number;
  checkInDate: string;
  checkOutDate: string;
  sandbox: boolean;
  sourceLabel: string;
  cheapest?: NormalizedRateCard;
  rooms: Array<{
    code: string;
    nameAr: string;
    nameOriginal?: string;
    rates: NormalizedRateCard[];
  }>;
  /** Rates rejected by sanity checks — server-side only. */
  rejectedRates: Array<{ roomCode: string; reason: HotelPriceRejectReason; detail: string }>;
};

function hashRateKey(rateKey: string): string {
  let h = 0;
  for (let i = 0; i < rateKey.length; i += 1) {
    h = (h * 31 + rateKey.charCodeAt(i)) >>> 0;
  }
  return `rk_${h.toString(16)}`;
}

const ROOM_NAME_AR: Record<string, string> = {
  "JUNIOR SUITE STANDARD": "جناح جونيور قياسي",
  "JUNIOR SUITE": "جناح جونيور",
  "DOUBLE STANDARD": "غرفة مزدوجة قياسية",
  "STANDARD DOUBLE": "غرفة مزدوجة قياسية",
  "DOUBLE OR TWIN STANDARD": "غرفة مزدوجة قياسية",
  "DOUBLE DELUXE": "غرفة مزدوجة ديلوكس",
  "SINGLE DELUXE": "غرفة مفردة ديلوكس",
  "SINGLE STANDARD": "غرفة مفردة قياسية",
  "TWIN STANDARD": "غرفة توأم قياسية",
  "TWIN DELUXE": "غرفة توأم ديلوكس",
  "KING ROOM": "غرفة كينغ",
  "KING BED": "غرفة كينغ",
  "FAMILY ROOM": "غرفة عائلية",
  "SUPERIOR ROOM": "غرفة سوبيريور",
  "DELUXE ROOM": "غرفة ديلوكس",
  SUITE: "جناح",
  STUDIO: "استوديو",
  DOUBLE: "غرفة مزدوجة",
  SINGLE: "غرفة مفردة",
  TWIN: "غرفة توأم",
};

export function translateRoomNameAr(name?: string): { ar: string; original?: string } {
  const raw = String(name || "غرفة").trim();
  const upper = raw.toUpperCase();
  // Longer keys first so "JUNIOR SUITE STANDARD" wins over "SUITE"
  const keys = Object.keys(ROOM_NAME_AR).sort((a, b) => b.length - a.length);
  for (const en of keys) {
    if (upper.includes(en)) {
      const ar = ROOM_NAME_AR[en]!;
      return { ar, original: raw !== ar ? raw : undefined };
    }
  }
  return { ar: raw };
}

export function translateFacilityLabelAr(label: string): string {
  let out = String(label || "").trim();
  if (!out) return out;

  // Fix known bad Arabic copy first
  out = out
    .replace(/مجهز للكراسي المدولبه\s*-?\s*لمتحدي الاعاقه/gi, "مهيأ لاستخدام الكراسي المتحركة")
    .replace(/مجهز للكراسي المدولبه/gi, "مهيأ لاستخدام الكراسي المتحركة")
    .replace(/لمتحدي الاعاقه/gi, "")
    .replace(/دوره المياه/gi, "دورة المياه")
    .replace(/دورة المياة/gi, "دورة المياه");

  const map: Record<string, string> = {
    Bathroom: "دورة المياه",
    bathroom: "دورة المياه",
    "Wheelchair accessible": "مهيأ لاستخدام الكراسي المتحركة",
    "Adapted rooms": "مهيأ لاستخدام الكراسي المتحركة",
    "Adapted for disabled": "مهيأ لاستخدام الكراسي المتحركة",
    Wheelchair: "مهيأ لاستخدام الكراسي المتحركة",
    Pool: "مسبح",
    WiFi: "واي فاي",
    Wifi: "واي فاي",
    "Internet access": "واي فاي",
    Parking: "موقف سيارات",
    Spa: "سبا",
    Breakfast: "إفطار",
  };
  const mapped = map[out];
  if (mapped) return mapped;

  return out
    .replace(/Bathroom/gi, "دورة المياه")
    .replace(/Wheelchair\s*accessible/gi, "مهيأ لاستخدام الكراسي المتحركة")
    .replace(/Adapted for disabled/gi, "مهيأ لاستخدام الكراسي المتحركة")
    .replace(/Wheelchair/gi, "مهيأ لاستخدام الكراسي المتحركة")
    .replace(/\bdisabled\b/gi, "ذوي الإعاقة")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Guest ratings: only accept explicit review fields.
 * Hotelbeds Content `ranking` is NOT a guest score — never invent reviewCount.
 */
export function normalizeGuestRating(details: Record<string, unknown>): NormalizedGuestRating {
  const scoreRaw = details.guestRatingScore ?? details.reviewScore;
  const score = Number(scoreRaw);
  if (!Number.isFinite(score) || score <= 0) return null;

  const scaleRaw = Number(details.guestRatingScale || details.reviewScale || 10);
  const scale: 5 | 10 = scaleRaw === 5 ? 5 : 10;
  if (score > scale) return null;

  const count = Number(details.guestReviewCount ?? details.reviewCount);
  const source = String(details.guestRatingSource || details.reviewSource || "").trim();
  if (!source) return null;

  return {
    score,
    scale,
    reviewCount: Number.isFinite(count) && count > 0 ? Math.round(count) : undefined,
    source,
  };
}

export function normalizeHotelStars(details: Record<string, unknown>): NormalizedHotelStars {
  const stars = Number(details.stars);
  if (Number.isFinite(stars) && stars >= 1 && stars <= 5) {
    return {
      stars: Math.round(stars),
      categoryCode: details.categoryCode ? String(details.categoryCode) : undefined,
      categoryName: details.categoryName ? String(details.categoryName) : undefined,
      source: "category",
    };
  }
  return {
    stars: null,
    categoryCode: details.categoryCode ? String(details.categoryCode) : undefined,
    categoryName: details.categoryName ? String(details.categoryName) : undefined,
    source: "unknown",
  };
}

function isSandbox(details: Record<string, unknown>): boolean {
  const source = String(details.source || "");
  if (source === "hotelbeds-sandbox" || source === "mock") return true;
  if (details.liveMode === false) return true;
  if (details.sandbox === true) return true;
  return false;
}

function sandboxLabel(details: Record<string, unknown>): string {
  if (isSandbox(details)) {
    const src = String(details.source || "");
    if (src === "mock") return "نتيجة تجريبية";
    return "نتيجة تجريبية من Hotelbeds Sandbox";
  }
  return String(details.sourceLabel || "عرض حي");
}

function normalizeRate(input: {
  rate: HotelRateOption;
  currency: string;
  nights: number;
  sellAmountMinor: MoneyMinor;
  costAmountMinor?: MoneyMinor;
  referenceNetMajor: number;
  netBasis: HotelNetBasis;
}): NormalizedRateCard {
  const { rate, currency, nights, sellAmountMinor, costAmountMinor, referenceNetMajor, netBasis } =
    input;
  const room = translateRoomNameAr(rate.roomName);
  const totalMinor = sellMinorForStayNet({
    rateNetMajor: rate.net,
    currency,
    sellAmountMinor,
    costAmountMinor,
    referenceNetMajor,
  });

  const breakdown = buildHotelPriceBreakdown({
    stayNetMajor: rate.net,
    currency,
    nights,
    rooms: rate.rooms,
    sellAmountMinor: totalMinor,
    costAmountMinor: costAmountMinor
      ? Math.round((costAmountMinor * rate.net) / Math.max(referenceNetMajor, rate.net))
      : undefined,
    dailyRates: rate.dailyRates,
    taxes: rate.taxes,
    netBasis,
  });

  const validation = validateHotelSellPrice({
    totalMinor,
    currency,
    nights,
    displayCurrency: currency,
    providerCurrency: rate.currency,
  });

  const allotment = rate.allotment;
  const availabilityLabel =
    allotment != null && allotment > 0 && allotment <= 5
      ? `متبقي ${allotment} غرفة`
      : "متاح للحجز";

  const card: NormalizedRateCard = {
    rateKeyHash: hashRateKey(rate.rateKey),
    roomCode: rate.roomCode,
    roomNameAr: room.ar,
    roomNameOriginal: room.original,
    boardCode: rate.boardCode,
    boardNameAr: boardLabelAr(rate.boardCode, rate.boardName),
    freeCancellation: rate.freeCancellation,
    paymentType: rate.paymentType,
    paymentLabelAr: paymentTypeLabelAr(rate.paymentType),
    allotment,
    availabilityLabel,
    currency,
    totalMinor: validation.ok ? validation.totalMinor : 0,
    perNightMinor: validation.ok ? validation.perNightMinor : 0,
    taxesIncluded: breakdown.taxesIncluded,
    excludedTaxMinor: breakdown.excludedTaxMinor,
    breakdown,
  };

  if (!validation.ok) {
    card.rejected = { reason: validation.reason, detail: validation.detail };
    card.totalMinor = 0;
    card.perNightMinor = 0;
  }

  return card;
}

export function normalizeHotelOffer(input: {
  details: HotelPropertyDetails | Record<string, unknown>;
  sellAmountMinor: MoneyMinor;
  costAmountMinor?: MoneyMinor;
  currency: string;
  netBasis?: HotelNetBasis;
}): NormalizedHotelOffer {
  const details = input.details as HotelPropertyDetails & Record<string, unknown>;
  const nights = Math.max(1, Number(details.nights) || 1);
  const currency = (input.currency || details.currency || "KWD").toUpperCase();
  const netBasis: HotelNetBasis = input.netBasis || "stay";
  const rateOptions = Array.isArray(details.rateOptions)
    ? (details.rateOptions as HotelRateOption[])
    : [];
  const referenceNetMajor = Number(details.minRate) || rateOptions[0]?.net || 0;

  const rejectedRates: NormalizedHotelOffer["rejectedRates"] = [];
  const roomsIn = Array.isArray(details.rooms) ? (details.rooms as HotelRoomOption[]) : [];

  const rooms = roomsIn.map((room) => {
    const name = translateRoomNameAr(room.name);
    const rates = (room.rates || [])
      .map((rate) =>
        normalizeRate({
          rate,
          currency,
          nights,
          sellAmountMinor: input.sellAmountMinor,
          costAmountMinor: input.costAmountMinor,
          referenceNetMajor: referenceNetMajor || rate.net,
          netBasis,
        }),
      )
      .filter((r) => {
        if (r.rejected) {
          rejectedRates.push({
            roomCode: r.roomCode,
            reason: r.rejected.reason,
            detail: r.rejected.detail,
          });
          return false;
        }
        return r.totalMinor > 0;
      });
    return { code: room.code, nameAr: name.ar, nameOriginal: name.original, rates };
  }).filter((r) => r.rates.length > 0);

  // Flat rates if rooms tree empty
  if (!rooms.length && rateOptions.length) {
    const rates = rateOptions
      .map((rate) =>
        normalizeRate({
          rate,
          currency,
          nights,
          sellAmountMinor: input.sellAmountMinor,
          costAmountMinor: input.costAmountMinor,
          referenceNetMajor: referenceNetMajor || rate.net,
          netBasis,
        }),
      )
      .filter((r) => {
        if (r.rejected) {
          rejectedRates.push({
            roomCode: r.roomCode,
            reason: r.rejected.reason,
            detail: r.rejected.detail,
          });
          return false;
        }
        return r.totalMinor > 0;
      });
    for (const rate of rates) {
      const existing = rooms.find((r) => r.code === rate.roomCode);
      if (existing) existing.rates.push(rate);
      else {
        rooms.push({
          code: rate.roomCode,
          nameAr: rate.roomNameAr,
          nameOriginal: rate.roomNameOriginal,
          rates: [rate],
        });
      }
    }
  }

  const allRates = rooms.flatMap((r) => r.rates).sort((a, b) => a.totalMinor - b.totalMinor);
  const facilityLabels = Array.isArray(details.facilityLabels)
    ? (details.facilityLabels as string[]).map(translateFacilityLabelAr).slice(0, 8)
    : [];

  return {
    hotelCode: String(details.hotelCode || ""),
    name: String(details.name || "فندق"),
    stars: normalizeHotelStars(details),
    guestRating: normalizeGuestRating(details),
    zoneName: details.zoneName ? String(details.zoneName) : undefined,
    distanceToCenterLabel: details.distanceToCenterLabel
      ? String(details.distanceToCenterLabel)
      : undefined,
    facilityLabels,
    imageUrl: typeof details.imageUrl === "string" ? details.imageUrl : undefined,
    currency,
    providerCurrency: details.providerCurrency
      ? String(details.providerCurrency)
      : undefined,
    nights,
    checkInDate: String(details.checkInDate || ""),
    checkOutDate: String(details.checkOutDate || ""),
    sandbox: isSandbox(details),
    sourceLabel: sandboxLabel(details),
    cheapest: allRates[0],
    rooms,
    rejectedRates,
  };
}

/** Safe list-card price from offer row — never multiplies nights into stay-total net. */
export function displayFromMinorForOffer(input: {
  sellAmountMinor: MoneyMinor;
  costAmountMinor?: MoneyMinor;
  currency: string;
  nights: number;
  minRateMajor?: number;
  rateNetMajor?: number;
}): { displayFromMinor: MoneyMinor; perNightMinor: MoneyMinor; valid: boolean; rejectDetail?: string } {
  const nights = Math.max(1, input.nights || 1);
  const rateNet = input.rateNetMajor ?? input.minRateMajor;
  let display = input.sellAmountMinor;
  if (rateNet && input.minRateMajor && rateNet !== input.minRateMajor) {
    display = sellMinorForStayNet({
      rateNetMajor: rateNet,
      currency: input.currency,
      sellAmountMinor: input.sellAmountMinor,
      costAmountMinor: input.costAmountMinor,
      referenceNetMajor: input.minRateMajor,
    });
  }
  const validation = validateHotelSellPrice({
    totalMinor: display,
    currency: input.currency,
    nights,
  });
  if (!validation.ok) {
    return {
      displayFromMinor: 0,
      perNightMinor: 0,
      valid: false,
      rejectDetail: `${validation.reason}: ${validation.detail}`,
    };
  }
  return {
    displayFromMinor: validation.totalMinor,
    perNightMinor: validation.perNightMinor,
    valid: true,
  };
}
