export type HotelSearchRank = "nearest" | "cheapest";

const BARE_CITIES = new Set(
  [
    "ruh",
    "jed",
    "dmm",
    "med",
    "dxb",
    "auh",
    "shj",
    "doh",
    "kwi",
    "bah",
    "mct",
    "cai",
    "amm",
    "bey",
    "ist",
    "saw",
    "lhr",
    "lon",
    "cdg",
    "par",
    "jfk",
    "nyc",
    "fra",
    "muc",
    "bcn",
    "pmi",
    "mad",
    "bkk",
    "kul",
    "sin",
    "gyd",
    "icn",
    "sel",
    "الرياض",
    "جدة",
    "دبي",
    "الدوحة",
    "القاهرة",
    "اسطنبول",
    "إسطنبول",
    "لندن",
    "باريس",
    "نيويورك",
    "باكو",
    "سيول",
    "الكويت",
    "مكة",
    "مكه",
    "mecca",
    "makkah",
    "المدينة المنورة",
    "medina",
    "madinah",
    "برشلونة",
    "barcelona",
    "مدريد",
    "madrid",
    "أبوظبي",
    "ابوظبي",
    "أبو ظبي",
    "الشارقة",
    "الدمام",
    "المدينة",
    "البحرين",
    "مسقط",
    "عمان",
    "عمّان",
    "بيروت",
    "بانكوك",
    "كوالالمبور",
    "سنغافورة",
    "ميونخ",
    "فرانكفورت",
    "مايوركا",
    "dubai",
    "doha",
    "cairo",
    "kuwait",
    "riyadh",
    "jeddah",
    "london",
    "paris",
    "istanbul",
    "muscat",
    "manama",
    "bahrain",
    "bangkok",
    "singapore",
    "seoul",
    "baku",
    "beirut",
    "amman",
    "abu dhabi",
    "sharjah",
    "dammam",
    "medina",
    "new york",
    "munich",
    "frankfurt",
    "mallorca",
    "kuala lumpur",
  ].map((name) => name.toLowerCase()),
);

const AREA_HINT =
  /قريب|بالقرب|قرب|جوار|جنب|حي|منطقة|شارع|مول|مارينا|كورنيش|near\b|nearby|close to|next to|district|neighbourhood|neighborhood/i;

/** Wider availability pull so a nearby hotel is not dropped for being pricier. */
export const NEAREST_HOTEL_CANDIDATES = 100;

/** Cheapest-to-last list when the customer asks for المزيد. */
export const PRICE_LIST_HOTEL_CANDIDATES = 100;
export const PRICE_LIST_MAX_ITEMS = 100;

/**
 * Nearest searches start inside a short walk of the place, then widen only
 * when that circle has too few hotels. They never use the 25 km city radius.
 */
export const NEAREST_RADIUS_STEPS_KM = [1.5, 3, 6];
export const NEAREST_MIN_RESULTS = 5;

export function hotelDistanceKm(row: { raw?: unknown }): number | null {
  const raw = row.raw as { distanceToCenterKm?: unknown } | undefined;
  const km = Number(raw?.distanceToCenterKm);
  return Number.isFinite(km) ? km : null;
}

export function hotelsWithinRadius<T extends { raw?: unknown }>(
  rows: T[],
  radiusKm: number,
): T[] {
  return rows.filter((row) => {
    const km = hotelDistanceKm(row);
    return km != null && km <= radiusKm + 0.25;
  });
}

function normalizePlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

const BARE_CITY_KEYS = new Set([...BARE_CITIES].map((name) => normalizePlace(name)));

export function isBareCityQuery(location: string): boolean {
  const raw = normalizePlace(location)
    .replace(/^(مدينه|city of)\s+/, "")
    .replace(/\s+المكرمه$/, "")
    .trim();
  return raw.length > 0 && BARE_CITY_KEYS.has(raw);
}

/**
 * A city with dates stays on price. Distance is only for a named place the
 * customer wants to be near, or an area that is not a bare city. A bare city
 * stays on price even if the model asks for nearest.
 */
export function resolveHotelSearchRank(
  explicit: unknown,
  location: string,
): HotelSearchRank {
  const asked = String(explicit ?? "")
    .trim()
    .toLowerCase();
  const loc = location.trim();
  if (asked === "cheapest" || asked === "price" || asked === "price_asc") {
    return "cheapest";
  }
  if (isBareCityQuery(loc)) return "cheapest";
  if (asked === "nearest" || asked === "closest" || asked === "distance") {
    return "nearest";
  }
  if (!loc) return "cheapest";
  if (AREA_HINT.test(loc)) return "nearest";
  return "nearest";
}

type RankableHotel = {
  costAmountMinor: number;
  sellAmountMinor?: number;
  raw?: unknown;
};

function sellMinor(row: RankableHotel): number {
  const sell = Number(row.sellAmountMinor);
  return Number.isFinite(sell) ? sell : row.costAmountMinor;
}

function distanceKm(row: RankableHotel): number {
  return hotelDistanceKm(row) ?? Number.POSITIVE_INFINITY;
}

export function rankHotelOffers<T extends RankableHotel>(
  rows: T[],
  rank: HotelSearchRank,
): T[] {
  const copy = [...rows];
  if (rank === "nearest") {
    copy.sort((a, b) => {
      const byDistance = distanceKm(a) - distanceKm(b);
      if (byDistance !== 0) return byDistance;
      return sellMinor(a) - sellMinor(b);
    });
    return copy;
  }
  copy.sort((a, b) => sellMinor(a) - sellMinor(b));
  return copy;
}
