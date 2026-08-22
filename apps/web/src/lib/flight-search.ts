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
  flightNumber?: string;
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

export function formatDay(value?: string | null) {
  if (!value) return "";
  const d = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return "";
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString("ar-KW", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export function airlineLogo(code?: string | null) {
  if (!code || code.length !== 2) return null;
  return `https://pics.avs.io/80/80/${code.toUpperCase()}.png`;
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

function scoreBest(a: FlightOfferRow) {
  const stops = Number(a.details.stops || 0);
  const mins = durationMinutes(a.details.durationMinutes ?? a.details.duration);
  return a.sellAmountMinor / 100 + stops * 120 + (mins === Number.MAX_SAFE_INTEGER ? 9999 : mins) * 0.8;
}

export function collectFlightFacets(flights: FlightOfferRow[]) {
  const currency = flights[0]?.currency || "KWD";
  const stopFacets: FlightStopFacets = {
    any: flights.length,
    direct: flights.filter((f) => Number(f.details.stops || 0) === 0).length,
    one: flights.filter((f) => Number(f.details.stops || 0) <= 1).length,
    minAny: flights.reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
    minDirect: flights
      .filter((f) => Number(f.details.stops || 0) === 0)
      .reduce((m, f) => Math.min(m, f.sellAmountMinor), Number.MAX_SAFE_INTEGER),
    minOne: flights
      .filter((f) => Number(f.details.stops || 0) <= 1)
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
    flights.reduce((m, f) => Math.max(m, f.sellAmountMinor), 0) / 100,
  );
  const durationMaxHours = Math.ceil(
    flights.reduce((m, f) => {
      const mins = durationMinutes(f.details.durationMinutes ?? f.details.duration);
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
    list = list.filter((f) => Number(f.details.stops || 0) === 0);
  } else if (filters.stops === "1") {
    list = list.filter((f) => Number(f.details.stops || 0) <= 1);
  }
  if (filters.airlines.length) {
    const selected = filters.airlines.map((c) => c.toUpperCase());
    list = list.filter((f) =>
      selected.includes(String(f.details.airlineCode || "").toUpperCase()),
    );
  }
  if (filters.maxPrice) {
    const max = Number(filters.maxPrice) * 100;
    if (Number.isFinite(max)) list = list.filter((f) => f.sellAmountMinor <= max);
  }
  if (filters.maxDurationHours) {
    const maxMins = Number(filters.maxDurationHours) * 60;
    if (Number.isFinite(maxMins)) {
      list = list.filter(
        (f) => durationMinutes(f.details.durationMinutes ?? f.details.duration) <= maxMins,
      );
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
    list = list.filter((f) => Number(f.details.stops || 0) === 0);
  }
  list.sort((a, b) => {
    if (sortKey === "best") return scoreBest(a) - scoreBest(b);
    if (sortKey === "price_desc") return b.sellAmountMinor - a.sellAmountMinor;
    if (sortKey === "duration_asc") {
      return (
        durationMinutes(a.details.durationMinutes ?? a.details.duration) -
        durationMinutes(b.details.durationMinutes ?? b.details.duration)
      );
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
