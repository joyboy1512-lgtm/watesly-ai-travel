import { hotelbedsHeaders, type HotelbedsCredentials } from "./hotelbeds-auth";
import type { HbContentHotel, HbContentHotelsResponse } from "./hotelbeds-content-types";

const IMAGE_CDN = "https://photos.hotelbeds.com/giata";
const CONTENT_CACHE_TTL_MS = 60 * 60 * 1000;

type ContentCacheEntry = { hotel: HbContentHotel; savedAt: number };
const contentHotelCache = new Map<number, ContentCacheEntry>();

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

  const now = Date.now();
  const missing: number[] = [];
  for (const code of unique) {
    const hit = contentHotelCache.get(code);
    if (hit && now - hit.savedAt < CONTENT_CACHE_TTL_MS) {
      map.set(code, hit.hotel);
    } else {
      missing.push(code);
    }
  }
  if (!missing.length) {
    console.info(`[hotelbeds-content] cache-hit codes=${unique.length}`);
    return map;
  }

  async function fetchChunk(chunk: number[], attempt: number): Promise<void> {
    const qs = new URLSearchParams({
      codes: chunk.join(","),
      fields: "all",
      language: "ARA",
    });
    const url = `${creds.baseUrl}/hotel-content-api/1.0/hotels?${qs}`;
    const started = Date.now();
    try {
      const response = await fetch(url, {
        headers: hotelbedsHeaders(creds),
        signal: AbortSignal.timeout
          ? AbortSignal.timeout(20_000)
          : undefined,
      });
      const json = (await response.json().catch(() => ({}))) as HbContentHotelsResponse & {
        error?: { message?: string };
        message?: string;
      };
      const ms = Date.now() - started;
      if (!response.ok) {
        const errMsg = json.error?.message || json.message || `HTTP ${response.status}`;
        const isQuota =
          response.status === 403 ||
          response.status === 429 ||
          /quota has been exceeded|too many requests|rate limit/i.test(errMsg);
        // Never retry quota — it burns the remaining sandbox allowance
        if (!isQuota && attempt < 1 && response.status >= 500) {
          await new Promise((r) => setTimeout(r, 400));
          return fetchChunk(chunk, attempt + 1);
        }
        console.warn(
          `[hotelbeds-content] chunk failed status=${response.status} ms=${ms} codes=${chunk.length} msg=${errMsg}`,
        );
        return;
      }
      const stamped = Date.now();
      for (const hotel of json.hotels || []) {
        if (hotel.code != null) {
          const code = Number(hotel.code);
          map.set(code, hotel);
          contentHotelCache.set(code, { hotel, savedAt: stamped });
        }
      }
      console.info(
        `[hotelbeds-content] ok hotels=${json.hotels?.length || 0} ms=${ms} codes=${chunk.length}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < 1 && !/quota has been exceeded/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 400));
        return fetchChunk(chunk, attempt + 1);
      }
      console.warn(
        `[hotelbeds-content] error ms=${Date.now() - started}`,
        msg,
      );
    }
  }

  for (let i = 0; i < missing.length; i += 100) {
    const chunk = missing.slice(i, i + 100);
    await fetchChunk(chunk, 0);
  }
  // Bound content cache
  if (contentHotelCache.size > 500) {
    const oldest = [...contentHotelCache.entries()].sort(
      (a, b) => a[1].savedAt - b[1].savedAt,
    );
    for (const [code] of oldest.slice(0, contentHotelCache.size - 400)) {
      contentHotelCache.delete(code);
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
  const ordered = [...images].sort(
    (a, b) => (a.visualOrder ?? a.order ?? 999) - (b.visualOrder ?? b.order ?? 999),
  );
  const pick = general[0] || ordered[0];
  return hotelbedsImageUrl(pick?.path, "bigger");
}

/** Match availability room codes (e.g. DBL.ST-1) to content room codes (DBL.ST). */
export function resolveContentRoomCode(
  content: HbContentHotel | undefined,
  roomCode: string | undefined,
): string | undefined {
  if (!content || !roomCode) return undefined;
  const codes = (content.rooms || []).map((r) => r.roomCode).filter(Boolean) as string[];
  if (codes.includes(roomCode)) return roomCode;
  const base = roomCode.split(/[.\-]/)[0] || roomCode;
  const exactPrefix = codes.find((c) => c === roomCode.split("-")[0]);
  if (exactPrefix) return exactPrefix;
  const byStart = codes.find(
    (c) => c.startsWith(base) || roomCode.startsWith(c) || c.split(".")[0] === base,
  );
  return byStart;
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
    if (!img.path) continue;
    const url = hotelbedsImageUrl(img.path, "bigger");
    if (!url) continue;
    // Hotel-level images (no roomCode) go under __hotel__
    const key = img.roomCode || "__hotel__";
    const list = out[key] ?? [];
    if (!list.includes(url)) list.push(url);
    out[key] = list;
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
