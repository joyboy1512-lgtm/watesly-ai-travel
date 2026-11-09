export const HOTEL_PHOTO_LIMIT = 4;

const PRICE_FREE_PHOTO_HOSTS = new Set(["photos.hotelbeds.com"]);
const EXTRA_PHOTO_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org"]);
const PHOTO_PAGE = 3;
const PHOTO_STORE_LIMIT = 40;

export type HotelPhotoSet = {
  hotelId: string;
  name: string;
  urls: string[];
};

export type StoredHotelPhotos = HotelPhotoSet & { shown: number };

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

/** Direct image files we may send: the supplier gallery, or a public image host. */
export function isCustomerHotelPhotoUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    if (PRICE_FREE_PHOTO_HOSTS.has(url.hostname)) return true;
    if (!EXTRA_PHOTO_HOSTS.has(url.hostname)) return false;
    return /\.(jpe?g|png|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Same Hotelbeds file in two sizes is one photo. */
export function photoKey(value: string): string {
  const raw = value.trim();
  try {
    const url = new URL(raw);
    const file = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "").toLowerCase();
    if (url.hostname === "photos.hotelbeds.com") return `hb:${file}`;
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export function keepCustomerPhotoUrls(values?: Array<string | null | undefined>, limit = PHOTO_STORE_LIMIT): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const value of values || []) {
    const url = String(value || "").trim();
    if (!isCustomerHotelPhotoUrl(url)) continue;
    const key = photoKey(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
    if (urls.length >= limit) break;
  }
  return urls;
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
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const row of ordered) {
    const url = String(row.url || "").trim();
    const key = photoKey(url);
    if (!isPriceFreeHotelPhotoUrl(url) || !key || seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
    if (urls.length >= limit) break;
  }
  return urls;
}

export function isPhotoMoreRequest(text: string): boolean {
  const normalized = text.trim().replace(/[!.؟?]/g, "").replace(/\s+/g, " ");
  if (!normalized) return false;
  if (
    normalized === "صور أكثر" ||
    normalized === "صور اكثر" ||
    normalized === "صور زيادة" ||
    normalized === "المزيد من الصور" ||
    normalized === "المزيد من صور الفندق"
  ) {
    return true;
  }
  return /المزيد|أكثر|اكثر|زيادة/.test(normalized) && /صور|صورة|صوره/.test(normalized);
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
  const urls = keepCustomerPhotoUrls(row.urls);
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

export function mergeHotelPhotos(
  previous: StoredHotelPhotos | undefined,
  next: HotelPhotoSet,
): StoredHotelPhotos {
  const same = previous?.hotelId === next.hotelId;
  const urls = keepCustomerPhotoUrls([...(same ? previous?.urls || [] : []), ...next.urls]);
  return {
    hotelId: next.hotelId,
    name: next.name || previous?.name || "الفندق",
    urls,
    shown: same ? Math.min(previous?.shown || 0, urls.length) : 0,
  };
}

const SKIP_PHOTO_TITLE = /logo|icon|flag|map|coat of arms|svg|banner|diagram/i;

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4 && !/^(hotel|hotels|resort|فندق|فنادق|the|and)$/u.test(word));
}

function cleanImageUrl(value: string): string {
  const url = new URL(value);
  url.search = "";
  return url.toString();
}

type CommonsPage = {
  title?: string;
  index?: number;
  imageinfo?: Array<{ thumburl?: string; url?: string; mime?: string }>;
};

export function commonsPhotoUrls(
  payload: { query?: { pages?: Record<string, CommonsPage> } },
  input: { name: string; already?: string[]; limit?: number },
): string[] {
  const tokens = nameTokens(input.name);
  const pages = Object.values(payload.query?.pages || {}).sort(
    (a, b) => Number(a.index || 0) - Number(b.index || 0),
  );
  const found: string[] = [];
  for (const page of pages) {
    const title = String(page.title || "");
    if (SKIP_PHOTO_TITLE.test(title)) continue;
    const haystack = title.toLowerCase();
    if (tokens.length && !tokens.some((token) => haystack.includes(token))) continue;
    const info = page.imageinfo?.[0];
    const mime = String(info?.mime || "");
    if (!/^image\/(jpeg|png|webp)$/.test(mime)) continue;
    const raw = info?.thumburl || info?.url || "";
    if (!isCustomerHotelPhotoUrl(raw)) continue;
    found.push(cleanImageUrl(raw));
  }
  return keepCustomerPhotoUrls(
    found.filter((url) => !keepCustomerPhotoUrls(input.already).some((seen) => photoKey(seen) === photoKey(url))),
    input.limit || 8,
  );
}

export async function findExternalHotelPhotos(input: {
  name: string;
  place?: string;
  already?: string[];
  limit?: number;
  fetchImpl?: typeof fetch;
}): Promise<string[]> {
  const name = input.name.trim();
  if (name.length < 3) return [];
  const fetchImpl = input.fetchImpl || fetch;
  const query = [name, input.place?.trim()].filter(Boolean).join(" ");
  const wanted = input.limit || 8;
  const collected: string[] = [];
  for (const offset of [0, 20]) {
    if (collected.length >= wanted) break;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      gsrlimit: "20",
      gsroffset: String(offset),
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "1200",
    });
    try {
      const response = await fetchImpl(`https://commons.wikimedia.org/w/api.php?${params}`, {
        headers: {
          accept: "application/json",
          "user-agent": "WeekendGate/1.0 (https://www.weekendgate.com; hotel photos)",
        },
      });
      if (!response.ok) continue;
      const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
      for (const url of commonsPhotoUrls(payload, {
        name,
        already: [...(input.already || []), ...collected],
        limit: wanted - collected.length,
      })) {
        collected.push(url);
      }
    } catch {
      break;
    }
  }
  return collected;
}

export async function advanceHotelPhotos(input: {
  photos?: StoredHotelPhotos;
  more: boolean;
  place?: string;
  fetchImpl?: typeof fetch;
}): Promise<{
  photos?: StoredHotelPhotos;
  page: string[];
  addedOutside: boolean;
}> {
  const current = input.photos;
  if (!current?.urls.length && !current?.name) {
    return { page: [], addedOutside: false };
  }
  const photos = current || { hotelId: "", name: "الفندق", urls: [], shown: 0 };
  const paging = input.more || photos.shown > 0;
  const start = paging ? photos.shown : 0;
  let urls = photos.urls;
  let addedOutside = false;
  let page = urls.slice(start, start + PHOTO_PAGE);
  if (page.length === 0 && (paging || urls.length === 0)) {
    const extra = await findExternalHotelPhotos({
      name: photos.name,
      place: input.place,
      already: urls,
      fetchImpl: input.fetchImpl,
    });
    if (extra.length) {
      urls = keepCustomerPhotoUrls([...urls, ...extra]);
      addedOutside = true;
      page = urls.slice(start, start + PHOTO_PAGE);
    }
  }
  return {
    photos: { ...photos, urls, shown: start + page.length },
    page,
    addedOutside,
  };
}
