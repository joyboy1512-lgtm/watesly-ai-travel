export type FlightTripType = "roundtrip" | "oneway" | "multicity";

export type FlightSearchLegParam = {
  origin: string;
  originLabel?: string;
  destination: string;
  destinationLabel?: string;
  departDate: string;
};

export type FlightResultsSearchParams = {
  tripType: FlightTripType;
  origin: string;
  originLabel: string;
  destination: string;
  destinationLabel: string;
  departDate: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabinClass: string;
  directOnly: boolean;
  flexibleDates: boolean;
  legs: FlightSearchLegParam[];
};

const DEFAULTS: FlightResultsSearchParams = {
  tripType: "roundtrip",
  origin: "",
  originLabel: "",
  destination: "",
  destinationLabel: "",
  departDate: "",
  returnDate: "",
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "economy",
  directOnly: false,
  flexibleDates: false,
  legs: [],
};

function num(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function encodeLegs(legs: FlightSearchLegParam[]) {
  try {
    return JSON.stringify(legs);
  } catch {
    return "";
  }
}

function decodeLegs(raw: string | null): FlightSearchLegParam[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        origin: String(row?.origin || ""),
        originLabel: String(row?.originLabel || row?.origin || ""),
        destination: String(row?.destination || ""),
        destinationLabel: String(row?.destinationLabel || row?.destination || ""),
        departDate: String(row?.departDate || ""),
      }))
      .filter((leg) => leg.origin && leg.destination && leg.departDate);
  } catch {
    return [];
  }
}

export function parseFlightResultsSearch(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): FlightResultsSearchParams {
  const get = (key: string) => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return Array.isArray(v) ? v[0] || null : v || null;
  };

  const tripRaw = String(get("tripType") || "roundtrip");
  const tripType: FlightTripType =
    tripRaw === "oneway" || tripRaw === "multicity" ? tripRaw : "roundtrip";

  return {
    tripType,
    origin: String(get("origin") || ""),
    originLabel: String(get("originLabel") || get("origin") || ""),
    destination: String(get("destination") || ""),
    destinationLabel: String(get("destinationLabel") || get("destination") || ""),
    departDate: String(get("departDate") || ""),
    returnDate: String(get("returnDate") || ""),
    adults: Math.max(1, num(get("adults"), DEFAULTS.adults)),
    children: num(get("children"), DEFAULTS.children),
    infants: num(get("infants"), DEFAULTS.infants),
    cabinClass: String(get("cabinClass") || DEFAULTS.cabinClass),
    directOnly: get("directOnly") === "1" || get("directOnly") === "true",
    flexibleDates: get("flex") === "1" || get("flex") === "true",
    legs: decodeLegs(get("legs")),
  };
}

export function buildFlightResultsHref(params: Partial<FlightResultsSearchParams>) {
  const q = new URLSearchParams();
  const tripType = params.tripType || "roundtrip";
  q.set("tripType", tripType);
  if (params.origin) q.set("origin", params.origin);
  if (params.originLabel) q.set("originLabel", params.originLabel);
  if (params.destination) q.set("destination", params.destination);
  if (params.destinationLabel) q.set("destinationLabel", params.destinationLabel);
  if (params.departDate) q.set("departDate", params.departDate);
  if (params.returnDate && tripType === "roundtrip") q.set("returnDate", params.returnDate);
  q.set("adults", String(params.adults ?? 1));
  q.set("children", String(params.children ?? 0));
  q.set("infants", String(params.infants ?? 0));
  q.set("cabinClass", params.cabinClass || "economy");
  if (params.directOnly) q.set("directOnly", "1");
  if (params.flexibleDates) q.set("flex", "1");
  if (tripType === "multicity" && params.legs?.length) {
    q.set("legs", encodeLegs(params.legs));
  }
  return `/flights/results?${q.toString()}`;
}

export function openFlightResultsInNewTab(params: Partial<FlightResultsSearchParams>) {
  const href = buildFlightResultsHref(params);
  const win = window.open(href, "_blank", "noopener,noreferrer");
  if (!win) {
    window.location.href = href;
  }
}

export function formatFlightSearchSummary(params: FlightResultsSearchParams) {
  const travelers = params.adults + params.children + params.infants;
  const route =
    params.tripType === "multicity" && params.legs.length
      ? `${params.legs.length} رحلات`
      : `${params.originLabel || params.origin || "—"} → ${params.destinationLabel || params.destination || "—"}`;
  const dates =
    params.tripType === "roundtrip" && params.returnDate
      ? `${params.departDate} – ${params.returnDate}`
      : params.tripType === "multicity"
        ? params.legs.map((l) => l.departDate).join(" · ")
        : params.departDate;
  return { route, dates, travelers };
}
