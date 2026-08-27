import { currencyMinorFactor } from "@watesly-travel/shared";
import { airlineNameAr, normalizeAirlineCode } from "./flight-airlines";

export type FlightOfferRow = {
  id: string;
  description: string;
  sellAmountMinor: number;
  currency: string;
  expiresAt?: string;
  details: Record<string, unknown>;
};

export type FlightSeg = {
  from?: string;
  to?: string;
  departAt?: string;
  arriveAt?: string;
  departTime?: string;
  arriveTime?: string;
  date?: string;
  airline?: string;
  airlineCode?: string;
  flightNumber?: string;
  aircraft?: string;
};

export type DepartureBucket = "night" | "morning" | "afternoon" | "evening";

export type FlightSortKey =
  | "best"
  | "price_asc"
  | "price_desc"
  | "duration_asc"
  | "cheapest_direct";

export type FlightSearchFilters = {
  stops: "any" | "0" | "1";
  airlines: string[];
  departureTimes: DepartureBucket[];
  returnDepartureTimes: DepartureBucket[];
  maxDurationHours: string;
  maxPrice: string;
};

export type FlightAirlineFacet = {
  code: string;
  name: string;
  count: number;
  minPrice: number;
  currency: string;
};

export type FlightStopFacets = {
  any: number;
  direct: number;
  one: number;
  minAny: number;
  minDirect: number;
  minOne: number;
  currency: string;
};

export const DEPARTURE_BUCKETS: Array<{
  key: DepartureBucket;
  label: string;
  hint: string;
}> = [
  { key: "night", label: "منتصف الليل – الفجر", hint: "12:00 ص – 5:59 ص" },
  { key: "morning", label: "الصباح", hint: "6:00 ص – 11:59 ص" },
  { key: "afternoon", label: "بعد الظهر", hint: "12:00 م – 5:59 م" },
  { key: "evening", label: "المساء", hint: "6:00 م – 11:59 م" },
];

export const defaultFlightFilters = (): FlightSearchFilters => ({
  stops: "any",
  airlines: [],
  departureTimes: [],
  returnDepartureTimes: [],
  maxDurationHours: "",
  maxPrice: "",
});

export function formatClock(value?: string | null) {
  if (!value) return "—";
  const m = value.match(/(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return value;
}

const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const AR_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function formatDay(value?: string | null) {
  if (!value) return "";
  const d = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  const [y, m, day] = d.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, day!));
  return `${AR_WEEKDAYS[utc.getUTCDay()]} ${day} ${AR_MONTHS[m! - 1]}`;
}

export function airlineLogo(code?: string | null, size = 80) {
  const c = normalizeAirlineCode(code);
  if (!c || c.length !== 2) return null;
  return `https://pics.avs.io/${size}/${size}/${c}.png`;
}

export function segmentAirlineCode(
  seg?: FlightSeg | null,
  packageCode?: string | null,
): string {
  if (!seg) return normalizeAirlineCode(packageCode);
  const fromSeg = normalizeAirlineCode(seg.airlineCode || seg.airline);
  if (fromSeg.length === 2) return fromSeg;
  const fromFn = seg.flightNumber?.match(/^([A-Z0-9]{2})/i)?.[1];
  if (fromFn) return fromFn.toUpperCase();
  return normalizeAirlineCode(packageCode);
}

export function flightAirlineNameAr(
  details: Record<string, unknown>,
  seg?: FlightSeg | null,
  leg: "out" | "return" = "out",
): string {
  const packageCode = String(details.airlineCode || "");
  const code = segmentAirlineCode(seg, packageCode);
  const segName = seg?.airline;
  if (leg === "out") {
    return airlineNameAr(code, String(details.airlineAr || details.airline || segName || code));
  }
  return airlineNameAr(code, String(details.airlineAr || segName || details.airline || code));
}

/** Compute leg duration in minutes from segment timestamps or fallback. */
export function computeLegDurationMinutes(
  segs: FlightSeg[],
  fallbackRaw?: unknown,
): number {
  if (segs.length) {
    const first = segs[0];
    const last = segs[segs.length - 1];
    const dep = first?.departAt || first?.departTime || "";
    const arr = last?.arriveAt || last?.arriveTime || "";
    if (dep && arr) {
      const parsed = parseTimeDiffMinutes(dep, arr);
      if (parsed != null && parsed > 0) return parsed;
    }
  }
  const mins = durationMinutes(fallbackRaw);
  return mins === Number.MAX_SAFE_INTEGER ? 0 : mins;
}

/** Diff two timestamps or HH:MM clocks; overnight arrivals supported. */
function parseTimeDiffMinutes(depart: string, arrive: string): number | null {
  const a = Date.parse(depart.includes("T") || depart.includes("-") ? depart : `1970-01-01T${normalizeClock(depart)}`);
  const b = Date.parse(arrive.includes("T") || arrive.includes("-") ? arrive : `1970-01-01T${normalizeClock(arrive)}`);
  if (Number.isFinite(a) && Number.isFinite(b)) {
    let diff = Math.round((b - a) / 60000);
    if (diff < 0 && !depart.includes("T") && !depart.includes("-")) {
      diff += 24 * 60; // clock-only overnight
    }
    return diff > 0 ? diff : null;
  }

  const dc = normalizeClock(depart).match(/^(\d{2}):(\d{2})/);
  const ac = normalizeClock(arrive).match(/^(\d{2}):(\d{2})/);
  if (!dc || !ac) return null;
  let mins =
    Number(ac[1]) * 60 + Number(ac[2]) - (Number(dc[1]) * 60 + Number(dc[2]));
  if (mins < 0) mins += 24 * 60;
  return mins > 0 ? mins : null;
}

function normalizeClock(value: string) {
  const m = value.match(/(\d{1,2}):(\d{2})/);
  if (!m) return value;
  return `${m[1]!.padStart(2, "0")}:${m[2]}:00`;
}

export function majorToMinor(major: number, currency: string) {
  return Math.round(major * currencyMinorFactor(currency));
}

export function minorToMajor(minor: number, currency: string) {
  return minor / currencyMinorFactor(currency);
}

export function cabinLabel(cabin?: string | null) {
  const map: Record<string, string> = {
    economy: "اقتصادية",
    premium_economy: "اقتصادية مميزة",
    business: "رجال أعمال",
    first: "الدرجة الأولى",
  };
  if (!cabin) return "اقتصادية";
  return map[cabin] || cabin;
}

export function stopsLabel(stops: number) {
  if (stops <= 0) return "مباشر";
  if (stops === 1) return "توقف واحد";
  return `${stops} توقفات`;
}

export function durationMinutes(raw: unknown) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return Number.MAX_SAFE_INTEGER;
  const iso = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (iso) return Number(iso[1] || 0) * 60 + Number(iso[2] || 0);
  const ar = raw.match(/(\d+)\s*س(?:\s*(\d+)\s*د)?/);
  if (ar) return Number(ar[1] || 0) * 60 + Number(ar[2] || 0);
  const colon = raw.match(/^(\d+):(\d+)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  return Number.MAX_SAFE_INTEGER;
}

export function formatMinutesLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return [h ? `${h}س` : "", m ? `${m}د` : ""].filter(Boolean).join(" ") || "0د";
}

export function layoverMinutes(arriveAt?: string, departAt?: string) {
  if (!arriveAt || !departAt) return null;
  const a = new Date(arriveAt).getTime();
  const b = new Date(departAt).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

export function getSegments(details: Record<string, unknown>): FlightSeg[] {
  return (Array.isArray(details.segments) ? details.segments : []) as FlightSeg[];
}

export function getReturnSegments(details: Record<string, unknown>): FlightSeg[] {
  return (Array.isArray(details.returnSegments)
    ? details.returnSegments
    : []) as FlightSeg[];
}

/** Stable key for the outbound itinerary (for round-trip two-step pick). */
export function outboundLegKey(flight: FlightOfferRow) {
  const segs = getSegments(flight.details);
  if (!segs.length) {
    return [
      String(flight.details.airlineCode || ""),
      String(flight.details.departAt || ""),
      String(flight.details.arriveAt || ""),
      String(flight.details.duration || ""),
    ].join("|");
  }
  return segs
    .map(
      (s) =>
        `${s.airline || ""}-${s.flightNumber || ""}-${s.from || ""}-${s.to || ""}-${s.departAt || s.departTime || ""}-${s.arriveAt || s.arriveTime || ""}`,
    )
    .join(">");
}

export function returnLegKey(flight: FlightOfferRow) {
  const segs = getReturnSegments(flight.details);
  if (!segs.length) return "";
  return segs
    .map(
      (s) =>
        `${s.airline || ""}-${s.flightNumber || ""}-${s.from || ""}-${s.to || ""}-${s.departAt || s.departTime || ""}-${s.arriveAt || s.arriveTime || ""}`,
    )
    .join(">");
}

/**
 * Deduplicate round-trip packages by outbound leg, keeping the cheapest package
 * for each unique outbound (used in step 1).
 */
export function uniqueOutboundFlights(flights: FlightOfferRow[]) {
  const map = new Map<string, FlightOfferRow>();
  for (const f of flights) {
    const key = outboundLegKey(f);
    const prev = map.get(key);
    if (!prev || f.sellAmountMinor < prev.sellAmountMinor) map.set(key, f);
  }
  return [...map.values()];
}

/** Packages that share the same outbound as the selected representative. */
export function packagesMatchingOutbound(
  flights: FlightOfferRow[],
  selectedOutbound: FlightOfferRow,
) {
  const key = outboundLegKey(selectedOutbound);
  return flights.filter((f) => outboundLegKey(f) === key);
}

export function flightDepartureHour(flight: FlightOfferRow, leg: "out" | "return" = "out") {
  const segs = leg === "return" ? getReturnSegments(flight.details) : getSegments(flight.details);
  const first = segs[0];
  const raw =
    first?.departAt ||
    first?.departTime ||
    (leg === "out" ? String(flight.details.departAt || flight.details.departTime || "") : "");
  if (!raw) return null;
  const m = String(raw).match(/(\d{2}):(\d{2})/);
  if (!m) return null;
  const hour = Number(m[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function departureBucket(hour: number): DepartureBucket {
  if (hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/** Max stops across outbound + return (Kayak-style package filter). */
export function packageMaxStops(flight: FlightOfferRow) {
  const outSegs = getSegments(flight.details);
  const retSegs = getReturnSegments(flight.details);
  const out = Number(
    flight.details.stops ?? Math.max(0, outSegs.length ? outSegs.length - 1 : 0),
  );
  const ret =
    retSegs.length > 0
      ? Number(flight.details.returnStops ?? Math.max(0, retSegs.length - 1))
      : 0;
  return Math.max(out, ret);
}

function scoreBest(a: FlightOfferRow) {
  const stops = packageMaxStops(a);
  const mins = totalTripDurationMinutes(a);
  const factor = currencyMinorFactor(a.currency || "KWD");
  return (
    a.sellAmountMinor / factor +
    stops * 120 +
    (mins === Number.MAX_SAFE_INTEGER ? 9999 : mins) * 0.8
  );
}

export function collectFlightFacets(flights: FlightOfferRow[]) {
  const currency = flights[0]?.currency || "KWD";
  const stopFacets: FlightStopFacets = {
    any: flights.length,
    direct: flights.filter((f) => packageMaxStops(f) === 0).length,
    one: flights.filter((f) => packageMaxStops(f) <= 1).length,
    minAny: flights.reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
    minDirect: flights
      .filter((f) => packageMaxStops(f) === 0)
      .reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
    minOne: flights
      .filter((f) => packageMaxStops(f) <= 1)
      .reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
    currency,
  };

  const airlineMap = new Map<string, FlightAirlineFacet>();
  for (const f of flights) {
    const code = String(f.details.airlineCode || "").toUpperCase();
    if (!code) continue;
    const name = String(f.details.airlineAr || f.details.airline || code);
    const prev = airlineMap.get(code);
    if (!prev) {
      airlineMap.set(code, {
        code,
        name,
        count: 1,
        minPrice: f.sellAmountMinor,
        currency: f.currency,
      });
    } else {
      prev.count += 1;
      prev.minPrice = Math.min(prev.minPrice, f.sellAmountMinor);
    }
  }

  const departureCounts: Record<DepartureBucket, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  const returnDepartureCounts: Record<DepartureBucket, number> = {
    night: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
  };
  for (const f of flights) {
    const outHour = flightDepartureHour(f, "out");
    if (outHour !== null) departureCounts[departureBucket(outHour)] += 1;
    const retHour = flightDepartureHour(f, "return");
    if (retHour !== null) returnDepartureCounts[departureBucket(retHour)] += 1;
  }

  const priceMaxMajor = Math.ceil(
    minorToMajor(
      flights.reduce((m, f) => Math.max(m, f.sellAmountMinor), 0),
      currency,
    ),
  );
  const durationMaxHours = Math.ceil(
    flights.reduce((m, f) => {
      const mins = totalTripDurationMinutes(f);
      return mins === Number.MAX_SAFE_INTEGER ? m : Math.max(m, mins / 60);
    }, 8),
  );

  return {
    stops: stopFacets,
    airlines: [...airlineMap.values()].sort((a, b) => a.name.localeCompare(b.name, "ar")),
    departureCounts,
    returnDepartureCounts,
    hasReturn: flights.some((f) => getReturnSegments(f.details).length > 0),
    priceMaxMajor: Math.max(priceMaxMajor, 50),
    durationMaxHours: Math.max(durationMaxHours, 8),
  };
}

export function filterAndSortFlights(
  flights: FlightOfferRow[],
  filters: FlightSearchFilters,
  sortKey: FlightSortKey,
  directOnly = false,
) {
  let list = [...flights];
  if (directOnly || filters.stops === "0") {
    list = list.filter((f) => packageMaxStops(f) === 0);
  } else if (filters.stops === "1") {
    list = list.filter((f) => packageMaxStops(f) <= 1);
  }
  if (filters.airlines.length) {
    const selected = filters.airlines.map((c) => c.toUpperCase());
    list = list.filter((f) =>
      selected.includes(String(f.details.airlineCode || "").toUpperCase()),
    );
  }
  if (filters.maxPrice) {
    const currency = flights[0]?.currency || "KWD";
    const max = majorToMinor(Number(filters.maxPrice), currency);
    if (Number.isFinite(max)) list = list.filter((f) => f.sellAmountMinor <= max);
  }
  if (filters.maxDurationHours) {
    const maxMins = Number(filters.maxDurationHours) * 60;
    if (Number.isFinite(maxMins)) {
      list = list.filter((f) => totalTripDurationMinutes(f) <= maxMins);
    }
  }
  if (filters.departureTimes.length) {
    list = list.filter((f) => {
      const hour = flightDepartureHour(f, "out");
      if (hour === null) return false;
      return filters.departureTimes.includes(departureBucket(hour));
    });
  }
  if (filters.returnDepartureTimes.length) {
    list = list.filter((f) => {
      const hour = flightDepartureHour(f, "return");
      if (hour === null) return false;
      return filters.returnDepartureTimes.includes(departureBucket(hour));
    });
  }
  if (sortKey === "cheapest_direct") {
    list = list.filter((f) => packageMaxStops(f) === 0);
  }
  list.sort((a, b) => {
    if (sortKey === "best") return scoreBest(a) - scoreBest(b);
    if (sortKey === "price_desc") return b.sellAmountMinor - a.sellAmountMinor;
    if (sortKey === "duration_asc") {
      return totalTripDurationMinutes(a) - totalTripDurationMinutes(b);
    }
    if (sortKey === "cheapest_direct") return a.sellAmountMinor - b.sellAmountMinor;
    return a.sellAmountMinor - b.sellAmountMinor;
  });
  return list;
}

export function flightFiltersActive(filters: FlightSearchFilters, directOnly = false) {
  return (
    directOnly ||
    filters.stops !== "any" ||
    filters.airlines.length > 0 ||
    filters.departureTimes.length > 0 ||
    filters.returnDepartureTimes.length > 0 ||
    Boolean(filters.maxPrice) ||
    Boolean(filters.maxDurationHours)
  );
}

/** Total trip duration (outbound + return when present). */
export function totalTripDurationMinutes(flight: FlightOfferRow) {
  const out = durationMinutes(flight.details.durationMinutes ?? flight.details.duration);
  const outSafe = out === Number.MAX_SAFE_INTEGER ? 0 : out;
  const returnSegs = getReturnSegments(flight.details);
  if (!returnSegs.length) return outSafe || Number.MAX_SAFE_INTEGER;
  const retRaw = durationMinutes(flight.details.returnDuration);
  if (retRaw !== Number.MAX_SAFE_INTEGER) return outSafe + retRaw;
  const retFirst = returnSegs[0];
  const retLast = returnSegs[returnSegs.length - 1];
  const computed = layoverMinutes(
    retFirst?.departAt || retFirst?.departTime,
    retLast?.arriveAt || retLast?.arriveTime,
  );
  return outSafe + (computed ?? 0);
}

export type FlightSortTabSummary = {
  key: FlightSortKey;
  label: string;
  priceMinor: number | null;
  durationMins: number | null;
  currency: string;
  flightId?: string;
};

/** Kayak-style Best / Cheapest / Quickest summaries from a result set. */
export function summarizeFlightSortTabs(
  flights: FlightOfferRow[],
  mode: "full" | "outbound" | "return" = "full",
): FlightSortTabSummary[] {
  const currency = flights[0]?.currency || "KWD";
  if (!flights.length) {
    return [
      { key: "best", label: "الأفضل", priceMinor: null, durationMins: null, currency },
      { key: "price_asc", label: "الأرخص", priceMinor: null, durationMins: null, currency },
      { key: "duration_asc", label: "الأسرع", priceMinor: null, durationMins: null, currency },
    ];
  }

  const durationOf = (f: FlightOfferRow) => {
    if (mode === "outbound") {
      return durationMinutes(f.details.durationMinutes ?? f.details.duration);
    }
    if (mode === "return") {
      const segs = getReturnSegments(f.details);
      if (!segs.length) return Number.MAX_SAFE_INTEGER;
      const retRaw = durationMinutes(f.details.returnDuration);
      if (retRaw !== Number.MAX_SAFE_INTEGER) return retRaw;
      const first = segs[0];
      const last = segs[segs.length - 1];
      return (
        layoverMinutes(
          first?.departAt || first?.departTime,
          last?.arriveAt || last?.arriveTime,
        ) ?? Number.MAX_SAFE_INTEGER
      );
    }
    return totalTripDurationMinutes(f);
  };

  const byBest = [...flights].sort((a, b) => scoreBest(a) - scoreBest(b))[0]!;
  const byPrice = [...flights].sort((a, b) => a.sellAmountMinor - b.sellAmountMinor)[0]!;
  const bySpeed = [...flights].sort((a, b) => durationOf(a) - durationOf(b))[0]!;

  return [
    {
      key: "best",
      label: "الأفضل",
      priceMinor: byBest.sellAmountMinor,
      durationMins: durationOf(byBest),
      currency: byBest.currency,
      flightId: byBest.id,
    },
    {
      key: "price_asc",
      label: "الأرخص",
      priceMinor: byPrice.sellAmountMinor,
      durationMins: durationOf(byPrice),
      currency: byPrice.currency,
      flightId: byPrice.id,
    },
    {
      key: "duration_asc",
      label: "الأسرع",
      priceMinor: bySpeed.sellAmountMinor,
      durationMins: durationOf(bySpeed),
      currency: bySpeed.currency,
      flightId: bySpeed.id,
    },
  ];
}
