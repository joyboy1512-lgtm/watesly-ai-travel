import { hotelbedsHeaders, type HotelbedsCredentials } from "./hotelbeds-auth";
import type { HbContentHotel, HbContentHotelsResponse } from "./hotelbeds-content-types";

const IMAGE_CDN = "https://photos.hotelbeds.com/giata";

export function hotelbedsImageUrl(path?: string, size: "medium" | "bigger" | "xl" = "bigger"): string | undefined {
  if (!path?.trim()) return undefined;
  return `${IMAGE_CDN}/${size}/${path.replace(/^\//, "")}`;
}

export async function fetchHotelbedsContentMap(
  creds: HotelbedsCredentials,
  codes: number[],
): Promise<Map<number, HbContentHotel>> {
  const map = new Map<number, HbContentHotel>();
  const unique = [...new Set(codes.filter((c) => Number.isFinite(c) && c > 0))];
  if (!unique.length || !creds.apiKey || !creds.apiSecret) return map;

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const qs = new URLSearchParams({
      codes: chunk.join(","),
      fields: "all",
      language: "ARA",
    });
    const url = `${creds.baseUrl}/hotel-content-api/1.0/hotels?${qs}`;
    try {
      const response = await fetch(url, { headers: hotelbedsHeaders(creds) });
      const json = (await response.json().catch(() => ({}))) as HbContentHotelsResponse;
      if (!response.ok) continue;
      for (const hotel of json.hotels || []) {
        if (hotel.code != null) map.set(Number(hotel.code), hotel);
      }
    } catch {
      // Content API is best-effort — search still works without images
    }
  }
  return map;
}

export function pickPrimaryHotelImage(hotel?: HbContentHotel): string | undefined {
  const images = hotel?.images || [];
  if (!images.length) return undefined;
  const general = images
    .filter((img) => !img.roomCode)
    .sort((a, b) => (a.visualOrder ?? a.order ?? 999) - (b.visualOrder ?? b.order ?? 999));
  const pick = general[0] || images.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))[0];
  return hotelbedsImageUrl(pick?.path, "bigger");
}

export function pickRoomImages(hotel?: HbContentHotel): Record<string, string> {
  const lists = pickRoomImageLists(hotel);
  const out: Record<string, string> = {};
  for (const [code, urls] of Object.entries(lists)) {
    if (urls[0]) out[code] = urls[0];
  }
  return out;
}

export function pickRoomImageLists(
  hotel?: HbContentHotel,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const images = [...(hotel?.images || [])].sort(
    (a, b) =>
      (a.visualOrder ?? a.order ?? 999) - (b.visualOrder ?? b.order ?? 999),
  );
  for (const img of images) {
    if (!img.roomCode || !img.path) continue;
    const url = hotelbedsImageUrl(img.path, "bigger");
    if (!url) continue;
    if (!out[img.roomCode]) out[img.roomCode] = [];
    if (!out[img.roomCode].includes(url)) out[img.roomCode].push(url);
  }
  return out;
}

type HbFacilityType = {
  code?: number;
  facilityGroupCode?: number;
  facilityTypologyCode?: number;
  description?: { content?: string };
};

let facilityCatalogCache: Map<string, string> | null = null;
let facilityCatalogPromise: Promise<Map<string, string>> | null = null;

const NOISE_LABEL = /^(hotel|\d+|yes|no|true|false)$/i;
const SKIP_KEYS = new Set([
  "10:20", // year of construction
  "10:30", // year of renovation
  "10:40", // annexes
  "10:50", // floors
  "10:70", // total rooms
  "10:80",
  "10:100",
]);

export async function fetchHotelbedsFacilityCatalog(
  creds: HotelbedsCredentials,
): Promise<Map<string, string>> {
  if (facilityCatalogCache) return facilityCatalogCache;
  if (facilityCatalogPromise) return facilityCatalogPromise;

  facilityCatalogPromise = (async () => {
    const map = new Map<string, string>();
    if (!creds.apiKey || !creds.apiSecret) return map;
    try {
      const qs = new URLSearchParams({
        fields: "all",
        language: "ARA",
        from: "1",
        to: "1000",
      });
      const url = `${creds.baseUrl}/hotel-content-api/1.0/types/facilities?${qs}`;
      const response = await fetch(url, { headers: hotelbedsHeaders(creds) });
      const json = (await response.json().catch(() => ({}))) as {
        facilities?: HbFacilityType[];
      };
      if (!response.ok) return map;
      for (const row of json.facilities || []) {
        const key = `${row.facilityGroupCode ?? 0}:${row.code ?? 0}`;
        const label = row.description?.content?.trim();
        if (!label || NOISE_LABEL.test(label) || SKIP_KEYS.has(key)) continue;
        map.set(key, label);
      }
    } catch {
      // catalog is optional
    }
    facilityCatalogCache = map;
    return map;
  })();

  return facilityCatalogPromise;
}
