import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";

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

export function parseRoomSize(text: string): string | null {
  const m = String(text || "").match(/(\d+(?:[.,]\d+)?)\s*(m²|m2|متر(?: مربع)?)/i);
  if (!m?.[1]) return null;
  return `${m[1].replace(",", ".")} m²`;
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

/** Facts shown under the room photo, Traveloka-style. */
export function pickRoomFacts(room: HotelRoomOption): string[] {
  const blob = [room.name, room.description, ...(room.facilities || [])].join(" · ");
  const facts: string[] = [];
  const size = parseRoomSize(blob);
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
    if (parseRoomSize(fac)) continue;
    if (/أطفال|cot|crib|infant/i.test(fac)) continue;
    facts.push(fac);
  }
  return facts.slice(0, 5);
}
