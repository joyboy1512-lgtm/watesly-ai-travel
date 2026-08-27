import {
  durationMinutes,
  formatMinutesLabel,
  getReturnSegments,
  getSegments,
  outboundLegKey,
  returnLegKey,
  type FlightOfferRow,
  type FlightSeg,
} from "./flight-search";

export type LegKind = "outbound" | "return";

export type SelectedLeg = {
  kind: LegKind;
  key: string;
  sourceFlightId: string;
  sourceOfferRef: string;
  segments: FlightSeg[];
  airlineCode: string;
  airlineName: string;
  stops: number;
  durationMinutes: number;
  durationLabel: string;
  departAt: string;
  arriveAt: string;
  from: string;
  to: string;
  priceMinor: number;
  currency: string;
  baggage: Record<string, string>;
  policies: Record<string, unknown>;
  cabin: string;
  flightNumbers: string;
};

const OUTBOUND_SHARE = 0.52;

export function legKey(flight: FlightOfferRow, kind: LegKind): string {
  return kind === "outbound" ? outboundLegKey(flight) : returnLegKey(flight);
}

export function allocateLegPriceMinor(flight: FlightOfferRow, kind: LegKind): number {
  const total = flight.sellAmountMinor;
  const hasReturn = getReturnSegments(flight.details).length > 0;
  if (!hasReturn) return total;
  return kind === "outbound"
    ? Math.round(total * OUTBOUND_SHARE)
    : Math.round(total * (1 - OUTBOUND_SHARE));
}

function legDuration(segs: FlightSeg[], fallbackRaw: unknown): number {
  if (segs.length >= 2) {
    const first = segs[0];
    const last = segs[segs.length - 1];
    const computed = durationMinutes(
      fallbackRaw ??
        (first?.departAt && last?.arriveAt
          ? undefined
          : undefined),
    );
    if (computed !== Number.MAX_SAFE_INTEGER) return computed;
    const dep = first?.departAt || first?.departTime;
    const arr = last?.arriveAt || last?.arriveTime;
    if (dep && arr) {
      const a = new Date(dep).getTime();
      const b = new Date(arr).getTime();
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
        return Math.round((b - a) / 60000);
      }
    }
  }
  const mins = durationMinutes(fallbackRaw);
  return mins === Number.MAX_SAFE_INTEGER ? 0 : mins;
}

export function extractLeg(flight: FlightOfferRow, kind: LegKind): SelectedLeg | null {
  const segs =
    kind === "outbound" ? getSegments(flight.details) : getReturnSegments(flight.details);
  if (!segs.length && kind === "return") return null;

  const first = segs[0];
  const last = segs[segs.length - 1] || first;
  const stops =
    kind === "outbound"
      ? Number(flight.details.stops ?? Math.max(0, segs.length - 1))
      : Math.max(0, segs.length - 1);

  const durationRaw =
    kind === "outbound"
      ? flight.details.durationMinutes ?? flight.details.duration
      : flight.details.returnDuration;

  const durMins = legDuration(segs, durationRaw);
  const code = String(
    kind === "outbound"
      ? flight.details.airlineCode || first?.airline || ""
      : first?.airline || flight.details.airlineCode || "",
  )
    .slice(0, 2)
    .toUpperCase();

  const depAt = String(
    first?.departAt || first?.departTime || (kind === "outbound" ? flight.details.departAt : ""),
  );
  const arrAt = String(
    last?.arriveAt || last?.arriveTime || (kind === "outbound" ? flight.details.arriveAt : ""),
  );

  const baggage = (flight.details.baggage || {}) as Record<string, string>;
  const policies = (flight.details.policies || {}) as Record<string, unknown>;

  return {
    kind,
    key: legKey(flight, kind),
    sourceFlightId: flight.id,
    sourceOfferRef: String(flight.details.originalOfferId || flight.id),
    segments: segs,
    airlineCode: code,
    airlineName: String(
      kind === "outbound"
        ? flight.details.airlineAr || flight.details.airline || code
        : first?.airline || flight.details.airlineAr || flight.details.airline || code,
    ),
    stops,
    durationMinutes: durMins,
    durationLabel: durMins ? formatMinutesLabel(durMins) : String(durationRaw || "—"),
    departAt: depAt,
    arriveAt: arrAt,
    from: String(first?.from || flight.details.from || flight.details.legOrigin || ""),
    to: String(last?.to || flight.details.to || flight.details.legDestination || ""),
    priceMinor: allocateLegPriceMinor(flight, kind),
    currency: flight.currency,
    baggage,
    policies,
    cabin: String(flight.details.cabin || "economy"),
    flightNumbers: segs
      .map((s) => s.flightNumber)
      .filter(Boolean)
      .join(" / "),
  };
}

export function findFlightForLeg(
  flights: FlightOfferRow[],
  key: string,
  kind: LegKind,
): FlightOfferRow | null {
  for (const f of flights) {
    if (legKey(f, kind) === key) return f;
  }
  return null;
}
