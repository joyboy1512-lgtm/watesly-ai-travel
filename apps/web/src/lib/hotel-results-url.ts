export type HotelResultsSearchParams = {
  destination: string;
  destinationLabel: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  rooms: number;
  /** CSV ages for all children across rooms */
  childrenAges: string;
  /**
   * Encoded per-room occupancy: `2-8.6|1` = room1: 2 adults + ages 8,6; room2: 1 adult
   */
  occ: string;
};

export type HotelRoomOccParam = {
  adults: number;
  childAges: number[];
};

const DEFAULTS: HotelResultsSearchParams = {
  destination: "",
  destinationLabel: "",
  checkIn: "",
  checkOut: "",
  adults: 1,
  children: 0,
  infants: 0,
  rooms: 1,
  childrenAges: "",
  occ: "",
};

function num(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function encodeRoomOccupancies(rooms: HotelRoomOccParam[]): string {
  return rooms
    .map((r) => {
      const adults = Math.max(1, r.adults || 1);
      const ages = (r.childAges || [])
        .map((a) => Math.max(0, Math.min(17, Math.round(Number(a)))))
        .filter((a) => Number.isFinite(a));
      return ages.length ? `${adults}-${ages.join(".")}` : String(adults);
    })
    .join("|");
}

export function decodeRoomOccupancies(raw?: string | null): HotelRoomOccParam[] | null {
  const text = String(raw || "").trim();
  if (!text) return null;
  const rooms = text
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [adultsRaw, agesRaw] = part.split("-");
      const adults = Math.max(1, Number(adultsRaw) || 1);
      const childAges = agesRaw
        ? agesRaw
            .split(".")
            .map((a) => Number(a))
            .filter((a) => Number.isFinite(a) && a >= 0 && a <= 17)
        : [];
      return { adults, childAges };
    });
  return rooms.length ? rooms : null;
}

export function occupancyFromSearchParams(params: HotelResultsSearchParams): HotelRoomOccParam[] {
  const decoded = decodeRoomOccupancies(params.occ);
  if (decoded?.length) return decoded;
  const ages = String(params.childrenAges || "")
    .split(",")
    .map((a) => Number(a.trim()))
    .filter((a) => Number.isFinite(a) && a >= 0 && a <= 17);
  const roomCount = Math.max(1, params.rooms || 1);
  const adults = Math.max(1, params.adults || 1);
  const children = Math.max(0, params.children || ages.length);
  while (ages.length < children) ages.push(8);
  const rooms: HotelRoomOccParam[] = [];
  let remainingAdults = adults;
  let remainingAges = [...ages.slice(0, children)];
  for (let i = 0; i < roomCount; i += 1) {
    const left = roomCount - i;
    const a = Math.max(1, Math.floor(remainingAdults / left));
    const c = Math.floor(remainingAges.length / left);
    rooms.push({
      adults: a,
      childAges: remainingAges.splice(0, c),
    });
    remainingAdults -= a;
  }
  if (remainingAdults > 0) rooms[0]!.adults += remainingAdults;
  if (remainingAges.length) rooms[0]!.childAges.push(...remainingAges);
  return rooms;
}

export function parseHotelResultsSearch(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): HotelResultsSearchParams {
  const get = (key: string) => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return Array.isArray(v) ? v[0] || null : v || null;
  };

  const destination = String(get("destination") || get("stayQuery") || "");
  const childrenAges = String(get("childrenAges") || "");
  const occ = String(get("occ") || "");
  const roomsDecoded = decodeRoomOccupancies(occ);
  let adults = Math.max(1, num(get("adults"), DEFAULTS.adults));
  let children = num(get("children"), DEFAULTS.children);
  let rooms = Math.max(1, num(get("rooms"), DEFAULTS.rooms));
  if (roomsDecoded?.length) {
    adults = roomsDecoded.reduce((s, r) => s + r.adults, 0);
    children = roomsDecoded.reduce((s, r) => s + r.childAges.length, 0);
    rooms = roomsDecoded.length;
  }

  return {
    destination,
    destinationLabel: String(get("destinationLabel") || destination),
    checkIn: String(get("checkIn") || get("departDate") || ""),
    checkOut: String(get("checkOut") || get("returnDate") || ""),
    adults,
    children,
    infants: num(get("infants"), DEFAULTS.infants),
    rooms,
    childrenAges:
      childrenAges ||
      (roomsDecoded
        ? roomsDecoded.flatMap((r) => r.childAges).join(",")
        : ""),
    occ: occ || (roomsDecoded ? encodeRoomOccupancies(roomsDecoded) : ""),
  };
}

/** Reconcile `occ` with adults/children/rooms after toolbar or edit changes. */
export function syncHotelSearchParams(
  params: HotelResultsSearchParams,
  patch: Partial<HotelResultsSearchParams>,
): HotelResultsSearchParams {
  const next: HotelResultsSearchParams = { ...params, ...patch };
  const decoded = decodeRoomOccupancies(next.occ);
  const totalsChanged =
    patch.adults != null ||
    patch.children != null ||
    patch.rooms != null ||
    patch.childrenAges != null;
  if (!totalsChanged) return next;
  if (decoded?.length) {
    const occAdults = decoded.reduce((s, r) => s + r.adults, 0);
    const occChildren = decoded.reduce((s, r) => s + r.childAges.length, 0);
    const occRooms = decoded.length;
    if (
      occAdults === next.adults &&
      occChildren === next.children &&
      occRooms === next.rooms
    ) {
      return next;
    }
  }
  next.occ = encodeRoomOccupancies(occupancyFromSearchParams(next));
  if (!next.childrenAges && next.children > 0) {
    next.childrenAges = occupancyFromSearchParams(next)
      .flatMap((r) => r.childAges)
      .join(",");
  }
  return next;
}

export function buildHotelResultsHref(params: Partial<HotelResultsSearchParams>) {
  const q = new URLSearchParams();
  const destination = params.destination || "";
  if (destination) q.set("destination", destination);
  if (params.destinationLabel) q.set("destinationLabel", params.destinationLabel);
  if (params.checkIn) q.set("checkIn", params.checkIn);
  if (params.checkOut) q.set("checkOut", params.checkOut);
  q.set("adults", String(params.adults ?? 1));
  q.set("children", String(params.children ?? 0));
  q.set("infants", String(params.infants ?? 0));
  q.set("rooms", String(params.rooms ?? 1));
  if (params.childrenAges) q.set("childrenAges", params.childrenAges);
  if (params.occ) q.set("occ", params.occ);
  return `/hotels/results?${q.toString()}`;
}

export function openHotelResultsInNewTab(params: Partial<HotelResultsSearchParams>) {
  const href = buildHotelResultsHref(params);
  const win = window.open(href, "_blank", "noopener,noreferrer");
  if (!win) {
    window.location.href = href;
  }
}

export function formatHotelSearchSummary(params: HotelResultsSearchParams) {
  const guests = params.adults + params.children;
  const nights = nightsBetween(params.checkIn, params.checkOut);
  return {
    destination: params.destinationLabel || params.destination || "—",
    dates:
      params.checkIn && params.checkOut
        ? `${params.checkIn} – ${params.checkOut}`
        : params.checkIn || "—",
    guests,
    rooms: params.rooms,
    nights,
  };
}

export function nightsBetween(from: string, to: string) {
  if (!from || !to) return 1;
  const a = new Date(`${from}T12:00:00`).getTime();
  const b = new Date(`${to}T12:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

export function hotelSearchPreferencesJson(params: HotelResultsSearchParams) {
  const roomOcc = occupancyFromSearchParams(params);
  return JSON.stringify({
    query: params.destination,
    rooms: params.rooms || 1,
    childrenAges: params.childrenAges || roomOcc.flatMap((r) => r.childAges).join(","),
    roomOccupancies: roomOcc.map((r) => ({
      adults: r.adults,
      children: r.childAges.length,
      childrenAges: r.childAges,
    })),
  });
}
