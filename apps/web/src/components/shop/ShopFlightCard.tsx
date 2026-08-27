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
  layoverMinutes,
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
  onViewDetails: () => void;
  badges?: Array<"best" | "cheapest" | "fastest">;
  displayLeg?: FlightCardDisplayLeg;
  passengers?: number;
  isExpanded?: boolean;
  selectLoading?: boolean;
  isHighlighted?: boolean;
  /** When picking a single leg in mix-match wizard */
  selectLabel?: string;
  enableMixMatch?: boolean;
  outboundKey?: string;
  returnKey?: string;
  selectedOutboundKey?: string | null;
  selectedReturnKey?: string | null;
  onToggleOutbound?: () => void;
  onToggleReturn?: () => void;
};

const BADGE_LABEL: Record<"best" | "cheapest" | "fastest", string> = {
  best: "الأفضل",
  cheapest: "الأرخص",
  fastest: "الأسرع",
};

const BADGE_WHY: Record<"best" | "cheapest" | "fastest", string> = {
  best: "توازن بين السعر والمدة وعدد التوقفات",
  cheapest: "أقل سعر إجمالي لهذه البحث",
  fastest: "أقصر مدة إجمالية للرحلة",
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

function codeshareNote(segs: FlightSeg[], packageCode: string): string | null {
  for (const seg of segs) {
    const marketing = segmentAirlineCode(seg, packageCode);
    const operating = String(
      seg.operatingAirlineCode || seg.operatingAirlineName || "",
    ).trim();
    if (!operating) continue;
    const opCode = operating.length === 2 ? operating.toUpperCase() : "";
    if (opCode && opCode !== marketing) {
      return `تشغيل فعلي: ${seg.operatingAirlineName || opCode}`;
    }
    if (!opCode && seg.operatingAirlineName) {
      return `تشغيل فعلي: ${seg.operatingAirlineName}`;
    }
  }
  return null;
}

function airportChangeNote(segs: FlightSeg[]): string | null {
  for (let i = 0; i < segs.length - 1; i += 1) {
    const cur = segs[i]!;
    const next = segs[i + 1]!;
    const arr = String(cur.to || "");
    const dep = String(next.from || "");
    if (arr && dep && arr !== dep) {
      return `تغيير مطار: ${arr} → ${dep}`;
    }
    const arrT = String(cur.arrivalTerminal || "").trim();
    const depT = String(next.departureTerminal || "").trim();
    if (arrT && depT && arrT !== depT) {
      return `تغيير صالة: ${arrT} → ${depT}`;
    }
  }
  return null;
}

function stopDurationHint(segs: FlightSeg[]): string | null {
  if (segs.length < 2) return null;
  const parts: string[] = [];
  for (let i = 0; i < segs.length - 1; i += 1) {
    const cur = segs[i]!;
    const next = segs[i + 1]!;
    const mins = layoverMinutes(
      cur.arriveAt || cur.arriveTime,
      next.departAt || next.departTime,
    );
    if (mins != null && mins > 0) {
      parts.push(`${cur.to || "توقف"} ${formatMinutesLabel(mins)}`);
    }
  }
  return parts.length ? parts.join(" · ") : null;
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
  const codeshare = codeshareNote(segs, packageCode);
  const airportChange = airportChangeNote(segs);
  const stopHint = stopDurationHint(segs);
  const depTerminal = first?.departureTerminal
    ? `صالة ${first.departureTerminal}`
    : null;
  const arrTerminal = segs[segs.length - 1]?.arrivalTerminal
    ? `صالة ${segs[segs.length - 1]!.arrivalTerminal}`
    : null;

  return (
    <div
      className={`shop-ticket-leg-v2 shop-ticket-leg-p1${mixEnabled ? " kayak-leg" : ""}${
        isReturn ? " is-return" : ""
      }${legSelected ? " is-leg-selected" : ""}`}
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
          {codeshare ? <em className="shop-ticket-codeshare">{codeshare}</em> : null}
        </div>
      </div>

      <div className="shop-ticket-time">
        <strong>{formatClock(depRaw)}</strong>
        <span>
          {from}
          {depTerminal ? ` · ${depTerminal}` : ""}
        </span>
      </div>

      <div className="shop-ticket-path">
        <div className="shop-ticket-path-line">
          <i className="shop-ticket-path-bar" />
          <span className="shop-ticket-meta-duration">{duration}</span>
        </div>
        <span className={`shop-ticket-meta-stops${stops === 0 ? " direct" : ""}`}>
          {stopsLabel(stops)}
        </span>
        {stopHint ? <small className="shop-ticket-stop-hint">{stopHint}</small> : null}
        {airportChange ? (
          <small className="shop-ticket-airport-change">{airportChange}</small>
        ) : null}
      </div>

      <div className="shop-ticket-time end">
        <strong>
          {formatClock(arrRaw)}
          {offset ? <sup className="shop-ticket-day-offset">{offset}</sup> : null}
        </strong>
        <span>
          {to}
          {arrTerminal ? ` · ${arrTerminal}` : ""}
        </span>
      </div>
    </div>
  );
}

export function ShopFlightCard({
  flight,
  originFallback = "",
  destinationFallback = "",
  onSelectFlight,
  onViewDetails,
  badges = [],
  displayLeg = "both",
  passengers = 1,
  isExpanded = false,
  selectLoading = false,
  isHighlighted = false,
  selectLabel = "اختيار هذه الرحلة",
  enableMixMatch = false,
  outboundKey,
  returnKey,
  selectedOutboundKey = null,
  selectedReturnKey = null,
  onToggleOutbound,
  onToggleReturn,
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
  const cabinBag = baggage.cabin || baggage.personal || "";
  const checkedBag = baggage.checked || "";
  const hasCabin = Boolean(cabinBag);
  const hasChecked = Boolean(checkedBag && !/غير|بدون|none|no /i.test(checkedBag));

  const from = String(first?.from || flight.details.legOrigin || flight.details.from || originFallback);
  const to = String(last?.to || flight.details.legDestination || flight.details.to || destinationFallback);
  const retFrom = String(retFirst?.from || to);
  const retTo = String(retLast?.to || from);

  const showOutbound = displayLeg === "both" || displayLeg === "outbound";
  const showReturn = displayLeg === "both" || displayLeg === "return";
  const outSelected = Boolean(outboundKey && selectedOutboundKey === outboundKey);
  const retSelected = Boolean(returnKey && selectedReturnKey === returnKey);
  const picked = isHighlighted || isExpanded || outSelected || retSelected;

  const pax = Math.max(1, passengers);
  const priceNote =
    pax > 1
      ? `السعر الإجمالي لـ ${pax} مسافرين · شامل الضرائب`
      : "السعر الإجمالي لمسافر واحد · شامل الضرائب";

  return (
    <article
      className={`shop-ticket-card shop-ticket-card-v2 shop-ticket-card-p1 shop-ticket-card-${displayLeg}${
        hasReturn && displayLeg === "both" ? " shop-ticket-card-roundtrip" : ""
      }${picked ? " is-picked" : ""}${isExpanded ? " is-expanded" : ""}`}
    >
      {badges.length ? (
        <div className="shop-ticket-badges">
          {badges.map((b) => (
            <span
              key={b}
              className={`shop-ticket-badge shop-ticket-badge-${b}`}
              title={BADGE_WHY[b]}
            >
              {BADGE_LABEL[b]}
              <em className="shop-ticket-badge-why">{BADGE_WHY[b]}</em>
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
              mixEnabled={enableMixMatch}
              legSelected={outSelected}
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
              legSelected={retSelected}
              onPickLeg={onToggleReturn}
            />
          ) : null}
        </div>
      </div>

      <div className="shop-ticket-side-v2">
        <strong className="shop-ticket-price">
          {formatMoneyMinor(flight.sellAmountMinor, flight.currency)}
        </strong>
        <small className="shop-ticket-price-note">{priceNote}</small>
        <div className="shop-ticket-cta-group">
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
            ) : (
              selectLabel
            )}
          </button>
          <button
            type="button"
            className="shop-ticket-details-link"
            onClick={onViewDetails}
          >
            التفاصيل والشروط
          </button>
        </div>
        <div className="shop-ticket-bags shop-ticket-bags-text">
          <span className={hasCabin ? "" : "off"}>
            🎒 {hasCabin ? cabinBag : "مقصورة حسب الفئة"}
          </span>
          <span className={hasChecked ? "" : "off"}>
            🧳 {hasChecked ? checkedBag : "مسجّلة حسب الفئة"}
          </span>
        </div>
      </div>
    </article>
  );
}
