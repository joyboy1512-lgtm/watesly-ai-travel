const STRIP_WORDS = new Set([
  "hotel",
  "hotels",
  "resort",
  "resorts",
  "suites",
  "suite",
  "apartment",
  "apartments",
  "residence",
  "residences",
  "the",
  "and",
  "hotel",
  "فندق",
  "فنادق",
  "منتجع",
  "شقق",
]);

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

export function normalizeHotelName(name: string): string {
  return String(name || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !STRIP_WORDS.has(w))
    .join(" ")
    .trim();
}

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)));
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export type HotelMappingInput = {
  providerKey: string;
  providerOfferRef?: string;
  description?: string;
  raw?: Record<string, unknown> | null;
};

function rawString(raw: Record<string, unknown> | null | undefined, key: string): string {
  const v = raw?.[key];
  return typeof v === "string" ? v.trim() : v != null ? String(v).trim() : "";
}

/** Stable property identity: GIATA → geo+name → supplier code → name. */
export function hotelPropertyFingerprint(input: HotelMappingInput): string {
  const raw = input.raw && typeof input.raw === "object" ? input.raw : {};
  const giata =
    rawString(raw, "giataId") ||
    rawString(raw, "giataCode") ||
    rawString(raw, "giata");
  if (giata) return `giata:${giata.toLowerCase()}`;

  const name = normalizeHotelName(
    rawString(raw, "name") ||
      rawString(raw, "nameEn") ||
      input.description ||
      "",
  );
  const lat = num(raw.latitude);
  const lon = num(raw.longitude);
  if (name && lat != null && lon != null) {
    // ~110m buckets so nearby listings of the same property collide.
    const latB = (Math.round(lat * 500) / 500).toFixed(3);
    const lonB = (Math.round(lon * 500) / 500).toFixed(3);
    return `geo:${name}|${latB}|${lonB}`;
  }

  const code =
    rawString(raw, "hotelCode") ||
    rawString(raw, "code") ||
    String(input.providerOfferRef || "").replace(/^[a-z]+-/i, "");
  if (name && code) return `code:${input.providerKey}:${code.toLowerCase()}:${name}`;
  if (code) return `code:${input.providerKey}:${code.toLowerCase()}`;
  return `name:${input.providerKey}:${name || "unknown"}`;
}

export function hotelsLikelySame(
  a: HotelMappingInput,
  b: HotelMappingInput,
  maxMeters = 180,
): boolean {
  if (hotelPropertyFingerprint(a) === hotelPropertyFingerprint(b)) return true;
  const rawA = a.raw || {};
  const rawB = b.raw || {};
  const nameA = normalizeHotelName(
    rawString(rawA, "name") || a.description || "",
  );
  const nameB = normalizeHotelName(
    rawString(rawB, "name") || b.description || "",
  );
  if (!nameA || nameA !== nameB) return false;
  const latA = num(rawA.latitude);
  const lonA = num(rawA.longitude);
  const latB = num(rawB.latitude);
  const lonB = num(rawB.longitude);
  if (latA == null || lonA == null || latB == null || lonB == null) return false;
  return haversineMeters(latA, lonA, latB, lonB) <= maxMeters;
}

export function genericOfferFingerprint(input: {
  providerKey: string;
  description?: string;
  raw?: Record<string, unknown> | null;
  extra?: string[];
}): string {
  const raw = input.raw && typeof input.raw === "object" ? input.raw : {};
  const parts = [
    normalizeHotelName(input.description || rawString(raw, "name") || ""),
    ...(input.extra || []).map((p) => normalizeHotelName(p)),
  ].filter(Boolean);
  return parts.join("|") || `solo:${input.providerKey}`;
}
