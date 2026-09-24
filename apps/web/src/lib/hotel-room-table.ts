import {
  type HotelRateOption,
  type HotelRoomOption,
} from "@watesly-travel/shared";

export { uniqueShopRooms } from "@watesly-travel/shared";

const BREAKFAST_BOARDS = new Set(["BB", "HB", "FB", "AI", "DB"]);

export function isBreakfastBoard(code?: string): boolean {
  return BREAKFAST_BOARDS.has(String(code || "").toUpperCase());
}

export function cheapestBreakfastRateKey(rates: HotelRateOption[]): string | null {
  let best: HotelRateOption | null = null;
  for (const rate of rates) {
    if (!isBreakfastBoard(rate.boardCode)) continue;
    if (!best || rate.net < best.net) best = rate;
  }
  return best?.rateKey || null;
}

export function guestCountForRate(rate: HotelRateOption, room: HotelRoomOption): number {
  const fromRate = Number(rate.adults || 0) + Number(rate.children || 0);
  if (fromRate > 0) return fromRate;
  if (room.occupancy?.maxPax && room.occupancy.maxPax > 0) return room.occupancy.maxPax;
  if (room.occupancy?.maxAdults && room.occupancy.maxAdults > 0) {
    return room.occupancy.maxAdults;
  }
  return 2;
}

export function guestCountForRoom(room: HotelRoomOption): number {
  return guestCountForRate(room.rates[0] || ({} as HotelRateOption), room);
}

export function parseRoomSize(text: string): string | null {
  const m = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(m²|m2|متر(?: مربع)?)/i);
  if (!m?.[1]) return null;
  return `${m[1].replace(",", ".")} m²`;
}

function looksLikeEmptySizeLabel(text: string): boolean {
  return /size|sqm|m²|m2|متر مربع|حجم الغرفة|square\s*metr/i.test(text) && !parseRoomSize(text);
}

export function looksLikeBed(text: string): boolean {
  if (/أطفال|cot|crib|infant/i.test(text)) return false;
  return /سرير|bed|sofa|كنبة|twin|king|queen|double/i.test(text);
}

function looksLikeAccess(text: string): boolean {
  return /wheelchair|إعاقة|مهيأ|accessible/i.test(text);
}

function looksLikeAircon(text: string): boolean {
  return /تكييف|air.?cond/i.test(text);
}

function looksLikeWifi(text: string): boolean {
  return /واي فاي|wifi|wi-fi/i.test(text);
}

export type RoomFactKind = "size" | "bed" | "access" | "ac" | "wifi" | "other";

export function classifyRoomFact(text: string): RoomFactKind {
  if (parseRoomSize(text)) return "size";
  if (looksLikeBed(text)) return "bed";
  if (looksLikeAccess(text)) return "access";
  if (looksLikeAircon(text)) return "ac";
  if (looksLikeWifi(text)) return "wifi";
  return "other";
}

/** Facts shown under the room photo, Traveloka-style. */
export function pickRoomFacts(room: HotelRoomOption): string[] {
  const blob = [room.name, room.description, ...(room.facilities || [])].join(" · ");
  const facts: string[] = [];
  const size =
    room.sizeSqm && room.sizeSqm > 0
      ? `${String(room.sizeSqm).replace(/\.0$/, "")} m²`
      : parseRoomSize(blob);
  if (size) facts.push(size);

  const facilities = room.facilities || [];
  const bed = facilities.find(looksLikeBed);
  if (bed) facts.push(bed);

  const access = facilities.find(looksLikeAccess);
  if (access) facts.push(access);

  const ac = facilities.find(looksLikeAircon);
  if (ac) facts.push(ac);

  const wifi = facilities.find(looksLikeWifi);
  if (wifi) facts.push(wifi);

  for (const fac of facilities) {
    if (facts.length >= 5) break;
    if (facts.includes(fac)) continue;
    if (parseRoomSize(fac) || looksLikeEmptySizeLabel(fac)) continue;
    if (/أطفال|cot|crib|infant/i.test(fac)) continue;
    facts.push(fac);
  }
  return facts.slice(0, 5);
}

export const VISIBLE_RATE_LIMIT = 3;

export function collectRoomImages(
  room: HotelRoomOption,
  extras?: {
    hotelImages?: Array<{ url?: string; roomCode?: string; type?: string }>;
    hotelHero?: string;
  },
): string[] {
  const urls: string[] = [];
  const push = (u?: string) => {
    const v = String(u || "").trim();
    if (v && !urls.includes(v)) urls.push(v);
  };
  push(room.imageUrl);
  for (const u of room.images || []) push(u);
  for (const img of extras?.hotelImages || []) {
    if (img.roomCode && room.code && String(img.roomCode) === String(room.code)) {
      push(img.url);
    }
  }
  if (urls.length < 2) {
    for (const img of extras?.hotelImages || []) {
      if (/HAB|ROOM|room/i.test(String(img.type || ""))) push(img.url);
    }
  }
  if (!urls.length) push(extras?.hotelHero);
  return urls;
}

export function groupRoomDetailFacts(room: HotelRoomOption) {
  const facts = pickRoomFacts(room);
  const info = facts.filter((f) => {
    const kind = classifyRoomFact(f);
    return kind === "size" || kind === "bed";
  });
  const features = facts.filter((f) => {
    const kind = classifyRoomFact(f);
    return kind === "access" || kind === "ac" || kind === "wifi";
  });
  const used = new Set([...info, ...features]);
  const rest = (room.facilities || []).filter(
    (f) =>
      !used.has(f) &&
      !parseRoomSize(f) &&
      !looksLikeEmptySizeLabel(f) &&
      !/أطفال|cot|crib|infant/i.test(f),
  );
  const mid = Math.ceil(rest.length / 2);
  return {
    info,
    features,
    basic: rest.slice(0, mid),
    room: rest.slice(mid),
  };
}
