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

export function isBareCityQuery(location: string): boolean {
  const raw = location.trim().toLowerCase();
  return raw.length > 0 && BARE_CITIES.has(raw);
}

/**
 * Area, neighborhood, landmark, or an explicit nearest request ranks by
 * distance. A city name alone, or an explicit cheapest request, stays on price.
 */
export function resolveHotelSearchRank(
  explicit: unknown,
  location: string,
): HotelSearchRank {
  const asked = String(explicit ?? "")
    .trim()
    .toLowerCase();
  if (asked === "nearest" || asked === "closest" || asked === "distance") {
    return "nearest";
  }
  if (asked === "cheapest" || asked === "price" || asked === "price_asc") {
    return "cheapest";
  }
  const loc = location.trim();
  if (!loc) return "cheapest";
  if (AREA_HINT.test(loc)) return "nearest";
  if (isBareCityQuery(loc)) return "cheapest";
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
  const raw = row.raw as { distanceToCenterKm?: unknown } | undefined;
  const km = Number(raw?.distanceToCenterKm);
  return Number.isFinite(km) ? km : Number.POSITIVE_INFINITY;
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
