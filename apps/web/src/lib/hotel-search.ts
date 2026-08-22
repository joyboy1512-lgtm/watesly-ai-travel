import {
  BED_TYPE_OPTIONS,
  BRAND_PATTERNS,
  countOptions,
  DISTANCE_OPTIONS,
  FACILITY_OPTIONS,
  hotelBedTypes,
  hotelBrandId,
  hotelDistanceKm,
  hotelHasBoard,
  hotelHasFacility,
  hotelHasFreeCancellation,
  hotelHasNoPrepayment,
  hotelHasOnlinePayment,
  hotelHasRoomFacility,
  hotelLandmarks,
  hotelReviewScore,
  MEAL_FILTER_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  REVIEW_SCORE_OPTIONS,
  ROOM_FACILITY_OPTIONS,
  STAR_RATING_OPTIONS,
  type FilterCountOption,
} from "@/lib/hotel-filter-options";

import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";

export type { FilterCountOption } from "@/lib/hotel-filter-options";

export type HotelFilterFacets = {
  boardCodes: string[];
  zones: string[];
  paymentTypes: string[];
  rateTypes: string[];
  meals: FilterCountOption[];
  propertyTypes: FilterCountOption[];
  facilities: FilterCountOption[];
  roomFacilities: FilterCountOption[];
  starRatings: FilterCountOption[];
  reviewScores: FilterCountOption[];
  zonesWithCounts: FilterCountOption[];
  distances: FilterCountOption[];
  landmarks: FilterCountOption[];
  brands: FilterCountOption[];
  bedTypes: FilterCountOption[];
  bookingPolicies: {
    freeCancellation: number;
    noPrepayment: number;
    onlinePayment: number;
    bookableOnly: number;
  };
  breakfastIncluded: number;
};


export type { HotelRateOption, HotelRoomOption, HotelPropertyDetails } from "@watesly-travel/shared";

export type HotelOfferRow = {
  id: string;
  description: string;
  sellAmountMinor: number;
  costAmountMinor?: number;
  currency: string;
  expiresAt?: string;
  details: Record<string, unknown>;
};

export type HotelSearchFilters = {
  hotelQuery: string;
  minStars: string;
  minReviewScore: "any" | "6" | "7" | "8" | "9";
  board: string;
  boardCode: string;
  zone: string;
  paymentType: string;
  rateType: string;
  freeCancellation: boolean;
  breakfast: boolean;
  noPrepayment: boolean;
  propertyTypes: string[];
  facilities: string[];
  roomFacilities: string[];
  starRatings: string[];
  mealTypes: string[];
  maxDistanceKm: string;
  landmarks: string[];
  brands: string[];
  bedTypes: string[];
  minBedrooms: number;
  minBathrooms: number;
  onlinePayment: boolean;
  maxPrice: string;
  refundableOnly: boolean;
  bookableOnly: boolean;
};

export const defaultHotelFilters = (): HotelSearchFilters => ({
  hotelQuery: "",
  minStars: "any",
  minReviewScore: "any",
  board: "",
  boardCode: "",
  zone: "",
  paymentType: "",
  rateType: "",
  freeCancellation: false,
  breakfast: false,
  noPrepayment: false,
  propertyTypes: [],
  facilities: [],
  roomFacilities: [],
  starRatings: [],
  mealTypes: [],
  maxDistanceKm: "",
  landmarks: [],
  brands: [],
  bedTypes: [],
  minBedrooms: 0,
  minBathrooms: 0,
  onlinePayment: false,
  maxPrice: "",
  refundableOnly: false,
  bookableOnly: false,
});

function rateOptionsOf(h: HotelOfferRow): HotelRateOption[] {
  const raw = h.details.rateOptions;
  return Array.isArray(raw) ? (raw as HotelRateOption[]) : [];
}

function matchingRates(h: HotelOfferRow, filters: HotelSearchFilters): HotelRateOption[] {
  let rates = rateOptionsOf(h);
  if (!rates.length) return [];

  if (filters.boardCode) {
    rates = rates.filter((r) => r.boardCode === filters.boardCode);
  } else if (filters.board) {
    const q = filters.board.toLowerCase();
    rates = rates.filter(
      (r) =>
        r.boardName.toLowerCase().includes(q) ||
        r.boardCode.toLowerCase().includes(q),
    );
  }
  if (filters.breakfast) {
    rates = rates.filter((r) => ["BB", "HB", "FB", "AI"].includes(r.boardCode));
  }
  if (filters.zone) {
    rates = rates.filter(() =>
      String(h.details.zoneName || h.details.neighborhood || "")
        .toLowerCase()
        .includes(filters.zone.toLowerCase()),
    );
  }
  if (filters.paymentType) {
    rates = rates.filter((r) => r.paymentType === filters.paymentType);
  }
  if (filters.rateType) {
    rates = rates.filter((r) => r.rateType === filters.rateType);
  }
  if (filters.freeCancellation || filters.refundableOnly) {
    rates = rates.filter((r) => r.freeCancellation);
  }
  if (filters.noPrepayment) {
    rates = rates.filter((r) => r.paymentType === "AT_HOTEL");
  }
  if (filters.bookableOnly) {
    rates = rates.filter((r) => r.rateType === "BOOKABLE");
  }
  if (filters.maxPrice) {
    const maxMajor = Number(filters.maxPrice);
    if (Number.isFinite(maxMajor) && maxMajor > 0) {
      rates = rates.filter((r) => r.net <= maxMajor);
    }
  }
  if (filters.onlinePayment) {
    rates = rates.filter((r) => r.paymentType === "AT_WEB");
  }
  if (filters.mealTypes.length) {
    rates = rates.filter((r) => {
      const code = r.boardCode;
      return filters.mealTypes.some((meal) => {
        if (meal === "BB") return ["BB", "HB", "FB", "AI"].includes(code);
        if (meal === "HB") return ["HB", "FB", "AI"].includes(code);
        if (meal === "FB") return ["FB", "AI"].includes(code);
        return code === meal;
      });
    });
  }
  return rates.sort((a, b) => a.net - b.net);
}

function currencyExponent(currency: string): number {
  return currency === "KWD" || currency === "BHD" || currency === "OMR" ? 1000 : 100;
}

export function rateDisplayMinor(
  rate: HotelRateOption,
  offer: HotelOfferRow,
  nights?: number,
): number {
  const n = (nights ?? Number(offer.details.nights || 1)) || 1;
  const costMinor = Math.round(rate.net * currencyExponent(offer.currency) * n);
  const ratio =
    offer.sellAmountMinor /
    Math.max(1, Number(offer.details.minRate || rate.net));
  return Math.round(costMinor * ratio) || offer.sellAmountMinor;
}

export function groupRatesIntoRooms(rates: HotelRateOption[]): HotelRoomOption[] {
  const map = new Map<string, HotelRoomOption>();
  for (const rate of rates) {
    const key = rate.roomCode || rate.roomName;
    const existing = map.get(key);
    if (existing) {
      existing.rates.push(rate);
    } else {
      map.set(key, {
        code: rate.roomCode || key,
        name: rate.roomName || key,
        rates: [rate],
      });
    }
  }
  return [...map.values()]
    .map((room) => ({
      ...room,
      rates: room.rates.sort((a, b) => a.net - b.net),
    }))
    .sort((a, b) => (a.rates[0]?.net ?? Infinity) - (b.rates[0]?.net ?? Infinity));
}

export function filterHotelOffers(
  hotels: HotelOfferRow[],
  filters: HotelSearchFilters,
  sortKey: "price_asc" | "price_desc" | "rating_desc" | "best",
): Array<HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number }> {
  let list = [...hotels];

  if (filters.hotelQuery.trim()) {
    const q = filters.hotelQuery.trim().toLowerCase();
    list = list.filter((h) =>
      `${h.details.name || ""} ${h.details.location || ""} ${h.details.zoneName || ""} ${h.description}`
        .toLowerCase()
        .includes(q),
    );
  }
  if (filters.minStars !== "any") {
    const min = Number(filters.minStars);
    list = list.filter((h) => Number(h.details.stars || 0) >= min);
  }
  if (filters.starRatings.length) {
    list = list.filter((h) =>
      filters.starRatings.includes(String(Number(h.details.stars || 0))),
    );
  }
  if (filters.minReviewScore !== "any") {
    const min = Number(filters.minReviewScore);
    list = list.filter((h) => hotelReviewScore(h) >= min);
  }
  if (filters.propertyTypes.length) {
    list = list.filter((h) =>
      filters.propertyTypes.includes(String(h.details.propertyType || "hotel")),
    );
  }
  if (filters.facilities.length) {
    list = list.filter((h) => filters.facilities.every((f) => hotelHasFacility(h, f)));
  }
  if (filters.roomFacilities.length) {
    list = list.filter((h) =>
      filters.roomFacilities.every((f) => hotelHasRoomFacility(h, f)),
    );
  }
  if (filters.maxDistanceKm) {
    const maxKm = Number(filters.maxDistanceKm);
    if (Number.isFinite(maxKm) && maxKm > 0) {
      list = list.filter((h) => {
        const km = hotelDistanceKm(h);
        return km != null && km <= maxKm;
      });
    }
  }
  if (filters.landmarks.length) {
    list = list.filter((h) => {
      const marks = hotelLandmarks(h);
      return filters.landmarks.some((mark) => marks.includes(mark));
    });
  }
  if (filters.brands.length) {
    list = list.filter((h) => {
      const brand = hotelBrandId(h);
      return brand != null && filters.brands.includes(brand);
    });
  }
  if (filters.bedTypes.length) {
    list = list.filter((h) => {
      const beds = hotelBedTypes(h);
      return filters.bedTypes.some((bed) => beds.includes(bed));
    });
  }
  if (filters.onlinePayment) {
    list = list.filter((h) => hotelHasOnlinePayment(h));
  }
  if (filters.noPrepayment) {
    list = list.filter((h) => hotelHasNoPrepayment(h));
  }
  if (filters.freeCancellation) {
    list = list.filter((h) => hotelHasFreeCancellation(h));
  }

  const enriched = list
    .map((h) => {
      const allRates = rateOptionsOf(h);
      const rates = matchingRates(h, filters);
      if (allRates.length && !rates.length) return null;
      if (!allRates.length) {
        return {
          ...h,
          matchingRates: [] as HotelRateOption[],
          displayFromMinor: h.sellAmountMinor,
        };
      }
      const cheapest = rates[0] || allRates[0];
      if (!cheapest) return null;
      const nights = Number(h.details.nights || 1) || 1;
      const costMinor = Math.round(cheapest.net * (h.currency === "KWD" ? 1000 : 100) * nights);
      const ratio = h.sellAmountMinor / Math.max(1, h.details.minRate ? Number(h.details.minRate) : cheapest.net);
      const displayFromMinor = Math.round(costMinor * ratio);
      return {
        ...h,
        matchingRates: rates.length ? rates : rateOptionsOf(h),
        displayFromMinor: displayFromMinor || h.sellAmountMinor,
      };
    })
    .filter(Boolean) as Array<
    HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number }
  >;

  enriched.sort((a, b) => {
    if (sortKey === "price_desc") return b.displayFromMinor - a.displayFromMinor;
    if (sortKey === "rating_desc") {
      return Number(b.details.rating || 0) - Number(a.details.rating || 0);
    }
    return a.displayFromMinor - b.displayFromMinor;
  });

  return enriched;
}

export function collectFilterFacets(hotels: HotelOfferRow[]): HotelFilterFacets {
  const boardCodes = new Set<string>();
  const zones = new Set<string>();
  const paymentTypes = new Set<string>();
  const rateTypes = new Set<string>();

  for (const h of hotels) {
    if (h.details.zoneName) zones.add(String(h.details.zoneName));
    for (const r of rateOptionsOf(h)) {
      if (r.boardCode) boardCodes.add(r.boardCode);
      if (r.paymentType) paymentTypes.add(r.paymentType);
      if (r.rateType) rateTypes.add(r.rateType);
    }
  }

  const zoneList = [...zones].sort();
  const landmarkMap = new Map<string, { id: string; label: string; count: number }>();
  for (const h of hotels) {
    for (const mark of hotelLandmarks(h)) {
      const existing = landmarkMap.get(mark);
      if (existing) existing.count += 1;
      else landmarkMap.set(mark, { id: mark, label: mark, count: 1 });
    }
  }

  return {
    boardCodes: [...boardCodes].sort(),
    zones: zoneList,
    paymentTypes: [...paymentTypes].sort(),
    rateTypes: [...rateTypes].sort(),
    meals: countOptions(hotels, MEAL_FILTER_OPTIONS, (h, id) => hotelHasBoard(h, id)),
    propertyTypes: countOptions(hotels, PROPERTY_TYPE_OPTIONS, (h, id) =>
      String(h.details.propertyType || "hotel") === id,
    ),
    facilities: countOptions(hotels, FACILITY_OPTIONS, (h, id) => hotelHasFacility(h, id)),
    roomFacilities: countOptions(hotels, ROOM_FACILITY_OPTIONS, (h, id) =>
      hotelHasRoomFacility(h, id),
    ),
    starRatings: STAR_RATING_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      count: hotels.filter((h) => Number(h.details.stars || 0) === Number(option.id)).length,
    })).filter((o) => o.count > 0),
    reviewScores: REVIEW_SCORE_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      count: hotels.filter((h) => hotelReviewScore(h) >= Number(option.id)).length,
    })).filter((o) => o.count > 0),
    zonesWithCounts: zoneList.map((z) => ({
      id: z,
      label: z,
      count: hotels.filter((h) => String(h.details.zoneName || "") === z).length,
    })),
    distances: DISTANCE_OPTIONS.map((option) => ({
      id: option.id,
      label: option.label,
      count: hotels.filter((h) => {
        const km = hotelDistanceKm(h);
        return km != null && km <= option.maxKm;
      }).length,
    })).filter((o) => o.count > 0),
    landmarks: [...landmarkMap.values()].sort((a, b) => b.count - a.count),
    brands: BRAND_PATTERNS.map((brand) => ({
      id: brand.id,
      label: brand.label,
      count: hotels.filter((h) => hotelBrandId(h) === brand.id).length,
    })).filter((o) => o.count > 0),
    bedTypes: countOptions(hotels, BED_TYPE_OPTIONS, (h, id) => hotelBedTypes(h).includes(id)),
    bookingPolicies: {
      freeCancellation: hotels.filter((h) => hotelHasFreeCancellation(h)).length,
      noPrepayment: hotels.filter((h) => hotelHasNoPrepayment(h)).length,
      onlinePayment: hotels.filter((h) => hotelHasOnlinePayment(h)).length,
      bookableOnly: hotels.filter((h) =>
        rateOptionsOf(h).some((r) => r.rateType === "BOOKABLE"),
      ).length,
    },
    breakfastIncluded: hotels.filter((h) => hotelHasBoard(h, "BB")).length,
  };
}

export function formatPolicyDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export {
  BOARD_LABELS_AR,
  taxTypeLabelAr,
} from "@watesly-travel/shared";
