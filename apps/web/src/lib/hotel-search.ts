import type { HotelRateOption } from "@watesly-travel/shared";

export type { HotelRateOption, HotelRoomOption, HotelPropertyDetails } from "@watesly-travel/shared";

export type HotelOfferRow = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  details: Record<string, unknown>;
};

export type HotelSearchFilters = {
  hotelQuery: string;
  minStars: string;
  minReviewScore: "any" | "7" | "8" | "9";
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
  const n = nights ?? Number(offer.details.nights || 1) || 1;
  const costMinor = Math.round(rate.net * currencyExponent(offer.currency) * n);
  const ratio =
    offer.sellAmountMinor /
    Math.max(1, Number(offer.details.minRate || rate.net));
  return Math.round(costMinor * ratio) || offer.sellAmountMinor;
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
  if (filters.minReviewScore !== "any") {
    const min = Number(filters.minReviewScore);
    list = list.filter((h) => Number(h.details.rating || 0) >= min);
  }
  if (filters.propertyTypes.length) {
    list = list.filter((h) =>
      filters.propertyTypes.includes(String(h.details.propertyType || "hotel")),
    );
  }
  if (filters.facilities.length) {
    list = list.filter((h) => {
      const fac = Array.isArray(h.details.facilities)
        ? (h.details.facilities as string[])
        : [];
      return filters.facilities.every((f) => fac.includes(f));
    });
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

export function collectFilterFacets(hotels: HotelOfferRow[]) {
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

  return {
    boardCodes: [...boardCodes].sort(),
    zones: [...zones].sort(),
    paymentTypes: [...paymentTypes].sort(),
    rateTypes: [...rateTypes].sort(),
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
} from "@watesly-travel/shared";
