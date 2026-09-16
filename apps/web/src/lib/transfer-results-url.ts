export type TransferResultsSearchParams = {
  origin: string;
  originLabel: string;
  dropoff: string;
  dropoffLabel: string;
  outboundDate: string;
  outboundTime: string;
  inboundDate: string;
  inboundTime: string;
  roundtrip: boolean;
  adults: number;
  children: number;
  infants: number;
};

const DEFAULTS: TransferResultsSearchParams = {
  origin: "KWI",
  originLabel: "",
  dropoff: "",
  dropoffLabel: "",
  outboundDate: "",
  outboundTime: "14:00",
  inboundDate: "",
  inboundTime: "12:00",
  roundtrip: false,
  adults: 1,
  children: 0,
  infants: 0,
};

function num(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function parseTransferResultsSearch(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): TransferResultsSearchParams {
  const get = (key: string) => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return Array.isArray(v) ? v[0] || null : v || null;
  };
  const dropoff = String(get("dropoff") || get("to") || "");
  return {
    origin: String(get("origin") || get("from") || DEFAULTS.origin),
    originLabel: String(get("originLabel") || get("origin") || ""),
    dropoff,
    dropoffLabel: String(get("dropoffLabel") || dropoff),
    outboundDate: String(get("outboundDate") || get("departDate") || ""),
    outboundTime: String(get("outboundTime") || DEFAULTS.outboundTime),
    inboundDate: String(get("inboundDate") || get("returnDate") || ""),
    inboundTime: String(get("inboundTime") || DEFAULTS.inboundTime),
    roundtrip: get("roundtrip") === "1" || get("roundtrip") === "true",
    adults: Math.max(1, num(get("adults"), DEFAULTS.adults)),
    children: num(get("children"), DEFAULTS.children),
    infants: num(get("infants"), DEFAULTS.infants),
  };
}

export function buildTransferResultsHref(params: Partial<TransferResultsSearchParams>) {
  const q = new URLSearchParams();
  if (params.origin) q.set("origin", params.origin);
  if (params.originLabel) q.set("originLabel", params.originLabel);
  if (params.dropoff) q.set("dropoff", params.dropoff);
  if (params.dropoffLabel) q.set("dropoffLabel", params.dropoffLabel);
  if (params.outboundDate) q.set("outboundDate", params.outboundDate);
  if (params.outboundTime) q.set("outboundTime", params.outboundTime);
  if (params.roundtrip) {
    q.set("roundtrip", "1");
    if (params.inboundDate) q.set("inboundDate", params.inboundDate);
    if (params.inboundTime) q.set("inboundTime", params.inboundTime);
  }
  q.set("adults", String(params.adults ?? 1));
  q.set("children", String(params.children ?? 0));
  q.set("infants", String(params.infants ?? 0));
  return `/transfers/results?${q.toString()}`;
}

export type ActivityResultsSearchParams = {
  destination: string;
  destinationLabel: string;
  fromDate: string;
  toDate: string;
  adults: number;
  children: number;
};

export function parseActivityResultsSearch(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): ActivityResultsSearchParams {
  const get = (key: string) => {
    if (input instanceof URLSearchParams) return input.get(key);
    const v = input[key];
    return Array.isArray(v) ? v[0] || null : v || null;
  };
  const destination = String(get("destination") || get("activityDest") || "");
  return {
    destination,
    destinationLabel: String(get("destinationLabel") || destination),
    fromDate: String(get("fromDate") || get("departDate") || ""),
    toDate: String(get("toDate") || get("returnDate") || ""),
    adults: Math.max(1, num(get("adults"), 1)),
    children: num(get("children"), 0),
  };
}

export function buildActivityResultsHref(params: Partial<ActivityResultsSearchParams>) {
  const q = new URLSearchParams();
  if (params.destination) q.set("destination", params.destination);
  if (params.destinationLabel) q.set("destinationLabel", params.destinationLabel);
  if (params.fromDate) q.set("fromDate", params.fromDate);
  if (params.toDate) q.set("toDate", params.toDate);
  q.set("adults", String(params.adults ?? 1));
  q.set("children", String(params.children ?? 0));
  return `/activities/results?${q.toString()}`;
}
