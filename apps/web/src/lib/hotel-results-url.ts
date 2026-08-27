export type HotelResultsSearchParams = {
  destination: string;
  destinationLabel: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  infants: number;
  rooms: number;
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
};

function num(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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
  return {
    destination,
    destinationLabel: String(get("destinationLabel") || destination),
    checkIn: String(get("checkIn") || get("departDate") || ""),
    checkOut: String(get("checkOut") || get("returnDate") || ""),
    adults: Math.max(1, num(get("adults"), DEFAULTS.adults)),
    children: num(get("children"), DEFAULTS.children),
    infants: num(get("infants"), DEFAULTS.infants),
    rooms: Math.max(1, num(get("rooms"), DEFAULTS.rooms)),
  };
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
