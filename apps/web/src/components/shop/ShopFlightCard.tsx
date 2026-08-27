"use client";

import { formatMoneyMinor } from "@/lib/format";
import {
  airlineLogo,
  computeLegDurationMinutes,
  durationMinutes,
  flightAirlineNameAr,
  formatClock,
  formatMinutesLabel,
  getReturnSegments,
  getSegments,
  segmentAirlineCode,
  stopsLabel,
  type FlightOfferRow,
  type FlightSeg,
} from "@/lib/flight-search";

export type FlightCardDisplayLeg = "outbound" | "return" | "both";

type Props = {
  flight: FlightOfferRow;
  originFallback?: string;
  destinationFallback?: string;
  onSelectFlight: () => void;
  badges?: Array<"best" | "cheapest" | "fastest">;
  displayLeg?: FlightCardDisplayLeg;
  priceFrom?: boolean;
  passengers?: number;
  enableMixMatch?: boolean;
  outboundKey?: string;
  returnKey?: string;
  selectedOutboundKey?: string | null;
  selectedReturnKey?: string | null;
  onToggleOutbound?: () => void;
  onToggleReturn?: () => void;
  isExpanded?: boolean;
  selectLoading?: boolean;
  isHighlighted?: boolean;
};

const BADGE_LABEL: Record<"best" | "cheapest" | "fastest", string> = {
  best: "الأفضل",
  cheapest: "الأرخص",
  fastest: "الأسرع",
};

function dayOffsetLabel(departAt?: string, arriveAt?: string) {
  if (!departAt || !arriveAt) return "";
  const d = new Date(departAt);
  const a = new Date(arriveAt);
  if (!Number.isFinite(d.getTime()) || !Number.isFinite(a.getTime())) return "";
  const dDay = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const aDay = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const diff = Math.round((aDay - dDay) / 86400000);
  if (diff <= 0) return "";
  return `+${diff}`;
}

function legDurationLabel(segs: FlightSeg[], fallbackRaw: unknown) {
  const mins = computeLegDurationMinutes(segs, fallbackRaw);
  if (mins > 0) return formatMinutesLabel(mins);
  // HH:MM mock strings (e.g. "03:26") — show as Arabic duration
  if (typeof fallbackRaw === "string") {
    const fromColon = durationMinutes(fallbackRaw);
    if (fromColon !== Number.MAX_SAFE_INTEGER && fromColon > 0) {
      return formatMinutesLabel(fromColon);
    }
    if (fallbackRaw.trim()) return fallbackRaw;
  }
  if (typeof fallbackRaw === "number" && fallbackRaw > 0) {
    return formatMinutesLabel(fallbackRaw);
  }
  return "—";
}

function LegBlock({
  segs,
  details,
  packageCode,
  depRaw,
  arrRaw,
  from,
  to,
  stops,
  durationRaw,
  isReturn,
  mixEnabled,
  legSelected,
  onPickLeg,
}: {
  segs: FlightSeg[];
  details: Record<string, unknown>;
  packageCode: string;
  depRaw: string;
  arrRaw: string;
  from: string;
  to: string;
  stops: number;
  durationRaw: unknown;
  isReturn?: boolean;
  mixEnabled?: boolean;
  legSelected?: boolean;
  onPickLeg?: () => void;
}) {
  const first = segs[0];
  const code = segmentAirlineCode(first, packageCode);
  const logo = airlineLogo(code, 96);
  const name = flightAirlineNameAr(details, first, isReturn ? "return" : "out");
  const flightNo = segs
    .map((s) => s.flightNumber)
    .filter(Boolean)
    .join(" · ");
  const duration = legDurationLabel(segs, durationRaw);
  const offset = dayOffsetLabel(
    depRaw.includes("T") ? depRaw : undefined,
    arrRaw.includes("T") ? arrRaw : undefined,
  );

  return (
    <div
      className={`shop-ticket-leg-v2 kayak-leg${isReturn ? " is-return" : ""}${
        legSelected ? " is-leg-selected" : ""
      }`}
      dir="ltr"
    >
      {mixEnabled ? (
        <label className="shop-ticket-kayak-check">
          <input
            type="checkbox"
            checked={Boolean(legSelected)}
            onChange={() => onPickLeg?.()}
            aria-label={isReturn ? "اختيار رحلة العودة" : "اختيار رحلة الذهاب"}
          />
        </label>
      ) : null}

      <div className="shop-ticket-airline-col">
        <div className="shop-ticket-airline-logo">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={name} width={40} height={40} />
          ) : (
            <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
          )}
        </div>
        <div className="shop-ticket-airline-text">
          <strong>{name}</strong>
          <span>{flightNo || code}</span>
        </div>
      </div>

      <div className="shop-ticket-time">
        <strong>{formatClock(depRaw)}</strong>
        <span>{from}</span>
      </div>

      <div className="shop-ticket-path">
        <div className="shop-ticket-path-line">
          <i className="shop-ticket-path-bar" />
          <span className="shop-ticket-meta-duration">{duration}</span>
        </div>
        <span className={`shop-ticket-meta-stops${stops === 0 ? " direct" : ""}`}>
          {stopsLabel(stops)}
        </span>
      </div>

      <div className="shop-ticket-time end">
        <strong>
          {formatClock(arrRaw)}
          {offset ? <sup className="shop-ticket-day-offset">{offset}</sup> : null}
        </strong>
        <span>{to}</span>
      </div>
    </div>
  );
}

export function ShopFlightCard({
  flight,
  originFallback = "",
  destinationFallback = "",
  onSelectFlight,
  badges = [],
  displayLeg = "both",
  priceFrom = false,
  passengers = 1,
  enableMixMatch = false,
  outboundKey = "",
  returnKey = "",
  selectedOutboundKey,
  selectedReturnKey,
  onToggleOutbound,
  onToggleReturn,
  isExpanded = false,
  selectLoading = false,
  isHighlighted = false,
}: Props) {
  const segs = getSegments(flight.details);
  const returnSegs = getReturnSegments(flight.details);
  const first = segs[0];
  const last = segs[segs.length - 1];
  const retFirst = returnSegs[0];
  const retLast = returnSegs[returnSegs.length - 1];
  const packageCode = String(flight.details.airlineCode || "");
  const stops = Number(flight.details.stops ?? Math.max(0, segs.length - 1));
  const returnStops = Number(
    flight.details.returnStops ?? Math.max(0, returnSegs.length - 1),
  );

  const outDepRaw = String(first?.departAt || first?.departTime || flight.details.departAt || "");
  const outArrRaw = String(last?.arriveAt || last?.arriveTime || flight.details.arriveAt || "");
  const retDepRaw = String(retFirst?.departAt || retFirst?.departTime || "");
  const retArrRaw = String(retLast?.arriveAt || retLast?.arriveTime || "");

  const hasReturn = returnSegs.length > 0;
  const baggage = (flight.details.baggage || {}) as Record<string, string>;
  const hasCabin = Boolean(baggage.cabin || baggage.personal);
  const hasChecked = Boolean(baggage.checked && !/غير|بدون|none|no /i.test(baggage.checked));

  const from = String(first?.from || flight.details.legOrigin || flight.details.from || originFallback);
  const to = String(last?.to || flight.details.legDestination || flight.details.to || destinationFallback);
  const retFrom = String(retFirst?.from || to);
  const retTo = String(retLast?.to || from);

  const showOutbound = displayLeg === "both" || displayLeg === "outbound";
  const showReturn = displayLeg === "both" || displayLeg === "return";

  const outboundSelected = Boolean(outboundKey && selectedOutboundKey === outboundKey);
  const returnSelected = Boolean(returnKey && selectedReturnKey === returnKey);
  const picked = outboundSelected || returnSelected || isHighlighted;

  const pax = Math.max(1, passengers);
  const priceNote =
    pax > 1
      ? `إجمالي ${pax} مسافرين · شامل الضرائب`
      : "إجمالي مسافر واحد · شامل الضرائب";

  return (
    <article
      className={`shop-ticket-card shop-ticket-card-v2 shop-ticket-card-${displayLeg}${
        hasReturn && displayLeg === "both" ? " shop-ticket-card-roundtrip" : ""
      }${picked ? " is-picked" : ""}${isExpanded ? " is-expanded" : ""}`}
    >
      {badges.length ? (
        <div className="shop-ticket-badges">
          {badges.map((b) => (
            <span key={b} className={`shop-ticket-badge shop-ticket-badge-${b}`}>
              {BADGE_LABEL[b]}
            </span>
          ))}
        </div>
      ) : null}

      <div className="shop-ticket-body-v2">
        <div className="shop-ticket-legs-v2">
          {showOutbound ? (
            <LegBlock
              segs={segs}
              details={flight.details}
              packageCode={packageCode}
              depRaw={outDepRaw}
              arrRaw={outArrRaw}
              from={from}
              to={to}
              stops={stops}
              durationRaw={flight.details.durationMinutes ?? flight.details.duration}
              mixEnabled={enableMixMatch && hasReturn}
              legSelected={outboundSelected}
              onPickLeg={onToggleOutbound}
            />
          ) : null}

          {showReturn && hasReturn ? (
            <LegBlock
              segs={returnSegs}
              details={flight.details}
              packageCode={packageCode}
              depRaw={retDepRaw}
              arrRaw={retArrRaw}
              from={retFrom}
              to={retTo}
              stops={returnStops}
              durationRaw={flight.details.returnDurationMinutes ?? flight.details.returnDuration}
              isReturn
              mixEnabled={enableMixMatch}
              legSelected={returnSelected}
              onPickLeg={onToggleReturn}
            />
          ) : null}
        </div>
      </div>

      <div className="shop-ticket-side-v2">
        <div className="shop-ticket-bags">
          {hasCabin ? <span title="حقيبة مقصورة">✓ 🎒</span> : <span className="off">🎒</span>}
          {hasChecked ? <span title="حقيبة مسجّلة">✓ 🧳</span> : <span className="off">🧳</span>}
        </div>
        <strong className="shop-ticket-price">
          {priceFrom ? "من " : ""}
          {formatMoneyMinor(flight.sellAmountMinor, flight.currency)}
        </strong>
        <small className="shop-ticket-price-note">{priceNote}</small>
        <button
          type="button"
          className="shop-ticket-details-btn primary"
          disabled={selectLoading}
          onClick={onSelectFlight}
        >
          {selectLoading ? (
            <span className="shop-flight-btn-loading">
              <span className="shop-flight-spinner small" aria-hidden />
            </span>
          ) : isExpanded ? (
            "إغلاق التفاصيل"
          ) : (
            "تفاصيل الرحلة"
          )}
        </button>
      </div>
    </article>
  );
}
