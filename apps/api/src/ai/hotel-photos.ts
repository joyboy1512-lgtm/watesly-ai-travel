export const HOTEL_PHOTO_LIMIT = 4;

const PRICE_FREE_PHOTO_HOSTS = new Set(["photos.hotelbeds.com"]);

export type HotelPhotoSet = {
  hotelId: string;
  name: string;
  urls: string[];
};

type PhotoRef = {
  url?: string;
  roomCode?: string;
};

/** Hotelbeds gallery files only. A hotel website or OTA page can show a lower rate. */
export function isPriceFreeHotelPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && PRICE_FREE_PHOTO_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function pickHotelPhotoUrls(
  images?: Array<PhotoRef | string> | null,
  limit = HOTEL_PHOTO_LIMIT,
): string[] {
  const rows: PhotoRef[] = (images || []).map((image) =>
    typeof image === "string" ? { url: image } : image,
  );
  const ordered = [
    ...rows.filter((row) => !row.roomCode),
    ...rows.filter((row) => row.roomCode),
  ];
  const urls: string[] = [];
  for (const row of ordered) {
    const url = String(row.url || "").trim();
    if (!isPriceFreeHotelPhotoUrl(url) || urls.includes(url)) continue;
    urls.push(url);
    if (urls.length >= limit) break;
  }
  return urls;
}

export function customerWantsHotelPhotos(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const document = /جواز|هوي[ةه]|passport|\bvisa\b|تأشير|تاشير/i.test(raw);
  const hotel = /فندق|غرف|hotel/i.test(raw);
  if (document && !hotel) return false;
  return /صور|صورة|صوره|\bphotos?\b|\bpictures?\b|\bpics?\b|\bgallery\b/i.test(raw);
}

export function readHotelPhotoSet(metadata: unknown): HotelPhotoSet | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const row = (metadata as { lastHotelPhotos?: Partial<HotelPhotoSet> }).lastHotelPhotos;
  if (!row) return undefined;
  const urls = pickHotelPhotoUrls(row.urls);
  const hotelId = String(row.hotelId || "").trim();
  if (!hotelId || !urls.length) return undefined;
  return {
    hotelId,
    name: String(row.name || "").trim() || "الفندق",
    urls,
  };
}

/** Drop links so a photo reply cannot open a page that shows another price. */
export function stripExternalLinks(text: string): string {
  return text
    .replace(/https?:\/\/[^\s)>\]]+/gi, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
