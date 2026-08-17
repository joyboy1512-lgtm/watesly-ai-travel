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
      language: "ENG",
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
  const out: Record<string, string> = {};
  for (const img of hotel?.images || []) {
    if (!img.roomCode || !img.path || out[img.roomCode]) continue;
    out[img.roomCode] = hotelbedsImageUrl(img.path, "medium") || "";
  }
  return out;
}
