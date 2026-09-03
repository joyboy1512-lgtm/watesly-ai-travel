import { pickHotelHighlightFacilities } from "@/lib/hotel-facilities";
import type { ShopLocale } from "@watesly-travel/shared";
import { tShop, type ShopUiKey } from "@watesly-travel/shared";

const AMENITY_KEYS: Array<{ match: RegExp; key: ShopUiKey }> = [
  { match: /wifi|واي/i, key: "amenityWifi" },
  { match: /pool|مسبح/i, key: "amenityPool" },
  { match: /breakfast|إفطار/i, key: "amenityBreakfast" },
  { match: /parking|موقف/i, key: "amenityParking" },
  { match: /spa|سبا/i, key: "amenitySpa" },
  { match: /gym|نادي/i, key: "amenityGym" },
  { match: /restaurant|مطعم/i, key: "amenityRestaurant" },
  { match: /airport|مطار/i, key: "amenityAirport" },
];

export function guestScoreBand(score: number, scale = 10): ShopUiKey {
  const normalized = scale === 5 ? score * 2 : score;
  if (normalized >= 9) return "scoreExcellent";
  if (normalized >= 8) return "scoreVeryGood";
  if (normalized >= 7) return "scoreGood";
  return "scoreFair";
}

/** Amenities the property actually lists — not fabricated guest quotes. */
export function hotelReviewHighlights(
  locale: ShopLocale,
  facilityLabels: string[] | undefined,
  limit = 6,
): string[] {
  const picked = pickHotelHighlightFacilities(facilityLabels, limit);
  return picked.map((label) => {
    const hit = AMENITY_KEYS.find((row) => row.match.test(label));
    return hit ? tShop(locale, hit.key) : label;
  });
}
