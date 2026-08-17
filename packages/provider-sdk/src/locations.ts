/** City / airport helpers for hotel geo search (Duffel Stays needs lat/lng). */

export type GeoPoint = { latitude: number; longitude: number; label: string };

const CITY_COORDS: Record<string, GeoPoint> = {
  RUH: { latitude: 24.7136, longitude: 46.6753, label: "الرياض" },
  JED: { latitude: 21.4858, longitude: 39.1925, label: "جدة" },
  DMM: { latitude: 26.4207, longitude: 50.0888, label: "الدمام" },
  MED: { latitude: 24.5247, longitude: 39.5692, label: "المدينة" },
  DXB: { latitude: 25.2048, longitude: 55.2708, label: "دبي" },
  AUH: { latitude: 24.4539, longitude: 54.3773, label: "أبوظبي" },
  SHJ: { latitude: 25.3463, longitude: 55.4209, label: "الشارقة" },
  DOH: { latitude: 25.2854, longitude: 51.531, label: "الدوحة" },
  KWI: { latitude: 29.3759, longitude: 47.9774, label: "الكويت" },
  BAH: { latitude: 26.0667, longitude: 50.5577, label: "البحرين" },
  MCT: { latitude: 23.588, longitude: 58.3829, label: "مسقط" },
  CAI: { latitude: 30.0444, longitude: 31.2357, label: "القاهرة" },
  AMM: { latitude: 31.9454, longitude: 35.9284, label: "عمّان" },
  BEY: { latitude: 33.8938, longitude: 35.5018, label: "بيروت" },
  IST: { latitude: 41.0082, longitude: 28.9784, label: "إسطنبول" },
  SAW: { latitude: 40.8986, longitude: 29.3092, label: "إسطنبول صبيحة" },
  LHR: { latitude: 51.47, longitude: -0.4543, label: "لندن" },
  LON: { latitude: 51.5074, longitude: -0.1278, label: "لندن" },
  CDG: { latitude: 49.0097, longitude: 2.5479, label: "باريس" },
  PAR: { latitude: 48.8566, longitude: 2.3522, label: "باريس" },
  JFK: { latitude: 40.6413, longitude: -73.7781, label: "نيويورك" },
  NYC: { latitude: 40.7128, longitude: -74.006, label: "نيويورك" },
  FRA: { latitude: 50.0379, longitude: 8.5622, label: "فرانكفورت" },
  MUC: { latitude: 48.3538, longitude: 11.7861, label: "ميونخ" },
  BKK: { latitude: 13.69, longitude: 100.7501, label: "بانكوك" },
  KUL: { latitude: 2.7456, longitude: 101.7072, label: "كوالالمبور" },
  SIN: { latitude: 1.3644, longitude: 103.9915, label: "سنغافورة" },
  GYD: { latitude: 40.4675, longitude: 50.0467, label: "باكو" },
  ICN: { latitude: 37.4602, longitude: 126.4407, label: "سيول" },
  SEL: { latitude: 37.5665, longitude: 126.978, label: "سيول" },
};

const NAME_ALIASES: Record<string, string> = {
  الرياض: "RUH",
  جدة: "JED",
  دبي: "DXB",
  الدوحة: "DOH",
  القاهرة: "CAI",
  اسطنبول: "IST",
  إسطنبول: "IST",
  لندن: "LON",
  باريس: "PAR",
  نيويورك: "NYC",
  باكو: "GYD",
  سيول: "ICN",
  الكويت: "KWI",
};

export function resolveGeoLocation(query: string): GeoPoint | null {
  const raw = query.trim();
  if (!raw) return null;

  const code = raw.toUpperCase();
  if (CITY_COORDS[code]) return CITY_COORDS[code];

  const alias = NAME_ALIASES[raw] || NAME_ALIASES[raw.toLowerCase()];
  if (alias && CITY_COORDS[alias]) return CITY_COORDS[alias];

  return null;
}

export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
  const known = resolveGeoLocation(query);
  if (known) return known;

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "WateslyTravelAI/1.0 (travel-search)",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
    }>;
    const first = data[0];
    if (!first) return null;
    return {
      latitude: Number(first.lat),
      longitude: Number(first.lon),
      label: first.display_name || query,
    };
  } catch {
    return null;
  }
}
