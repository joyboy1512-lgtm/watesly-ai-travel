"use client";

import { useState } from "react";
import { formatMoneyMinor } from "@/lib/format";
import {
  airlineLogo,
  durationMinutes,
  formatClock,
  formatMinutesLabel,
  getReturnSegments,
  getSegments,
  layoverMinutes,
  stopsLabel,
  type FlightOfferRow,
} from "@/lib/flight-search";

export type FlightCardDisplayLeg = "outbound" | "return" | "both";

type Props = {
  flight: FlightOfferRow;
  originFallback?: string;
  destinationFallback?: string;
  onViewDetails: () => void;
  badges?: Array<"best" | "cheapest" | "fastest">;
  selectLabel?: string;
  displayLeg?: FlightCardDisplayLeg;
  priceFrom?: boolean;
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

function compactDuration(raw: unknown, fallbackMins?: number | null) {
  const mins =
    typeof fallbackMins === "number" && Number.isFinite(fallbackMins)
      ? fallbackMins
      : durationMinutes(raw);
  if (mins === Number.MAX_SAFE_INTEGER) {
    return typeof raw === "string" && raw ? raw : "—";
  }
  return formatMinutesLabel(mins);
}

function LegRow({
  checked,
  onToggle,
  logo,
  code,
  dep,
  arr,
  from,
  to,
  stops,
  duration,
  dayOffset,
  isReturn,
}: {
  checked: boolean;
  onToggle: () => void;
  logo: string | null;
  code: string;
  dep: string;
  arr: string;
  from: string;
  to: string;
  stops: number;
  duration: string;
  dayOffset?: string;
  isReturn?: boolean;
}) {
  return (
    <div className={`shop-ticket-leg${isReturn ? " shop-ticket-leg-return" : ""}`}>
      <label className="shop-ticket-check">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label="اختيار الرحلة" />
      </label>
      <div className="shop-ticket-carrier" aria-hidden>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" />
        ) : (
          <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
        )}
      </div>
      <div className="shop-ticket-time">
        <strong>{dep}</strong>
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
          {arr}
          {dayOffset ? <sup className="shop-ticket-day-offset">{dayOffset}</sup> : null}
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
  onViewDetails,
  badges = [],
  selectLabel,
  displayLeg = "both",
  priceFrom = false,
}: Props) {
  const [picked, setPicked] = useState(false);
  const segs = getSegments(flight.details);
  const returnSegs = getReturnSegments(flight.details);
  const first = segs[0];
  const last = segs[segs.length - 1];
  const retFirst = returnSegs[0];
  const retLast = returnSegs[returnSegs.length - 1];
  const stops = Number(flight.details.stops || Math.max(0, segs.length - 1) || 0);
  const returnStops = Math.max(0, returnSegs.length - 1);
  const code = String(flight.details.airlineCode || "");
  const logo = airlineLogo(code);
  const returnCode = String(retFirst?.airline || code).slice(0, 2).toUpperCase();
  const returnLogo = airlineLogo(returnCode) || logo;

  const outDepRaw = first?.departAt || first?.departTime || String(flight.details.departAt || "");
  const outArrRaw = last?.arriveAt || last?.arriveTime || String(flight.details.arriveAt || "");
  const retDepRaw = retFirst?.departAt || retFirst?.departTime || "";
  const retArrRaw = retLast?.arriveAt || retLast?.arriveTime || "";

  const duration = compactDuration(
    flight.details.durationMinutes ?? flight.details.duration,
    layoverMinutes(outDepRaw, outArrRaw),
  );
  const returnDurationMins = layoverMinutes(retDepRaw, retArrRaw);
  const returnDuration = compactDuration(
    flight.details.returnDuration,
    returnDurationMins,
  );

  const isFlexible = Boolean(flight.details.flexible);
  const hasReturn = returnSegs.length > 0;
  const baggage = (flight.details.baggage || {}) as Record<string, string>;
  const hasCabin = Boolean(baggage.cabin || baggage.personal);
  const hasChecked = Boolean(baggage.checked && !/غير|بدون|none|no /i.test(baggage.checked));

  const dep = formatClock(outDepRaw);
  const arr = formatClock(outArrRaw);
  const from = String(first?.from || flight.details.legOrigin || flight.details.from || originFallback);
  const to = String(last?.to || flight.details.legDestination || flight.details.to || destinationFallback);
  const retDep = formatClock(retDepRaw);
  const retArr = formatClock(retArrRaw);
  const retFrom = String(retFirst?.from || to);
  const retTo = String(retLast?.to || from);
  const outOffset = dayOffsetLabel(
    typeof outDepRaw === "string" && outDepRaw.includes("T") ? outDepRaw : undefined,
    typeof outArrRaw === "string" && outArrRaw.includes("T") ? outArrRaw : undefined,
  );
  const retOffset = dayOffsetLabel(
    typeof retDepRaw === "string" && retDepRaw.includes("T") ? retDepRaw : undefined,
    typeof retArrRaw === "string" && retArrRaw.includes("T") ? retArrRaw : undefined,
  );

  const showOutbound = displayLeg === "both" || displayLeg === "outbound";
  const showReturn = displayLeg === "both" || displayLeg === "return";

  function togglePick() {
    setPicked(true);
  }

  return (
    <article
      className={`shop-ticket-card shop-ticket-card-compact shop-ticket-card-${displayLeg}${
        hasReturn && displayLeg === "both" ? " shop-ticket-card-roundtrip" : ""
      }${picked ? " is-picked" : ""}`}
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
      {isFlexible ? (
        <p className="shop-ticket-flex-note">ترقية تذكرة مرنة متاحة</p>
      ) : null}

      <div className="shop-ticket-body">
        <div className="shop-ticket-tools" aria-hidden>
          <button type="button" className="shop-ticket-tool-btn" tabIndex={-1}>
            ♡
          </button>
          <button type="button" className="shop-ticket-tool-btn" tabIndex={-1}>
            ↗
          </button>
        </div>

        <div className="shop-ticket-legs">
          {showOutbound ? (
            <LegRow
              checked={picked}
              onToggle={togglePick}
              logo={logo}
              code={code}
              dep={dep}
              arr={arr}
              from={from}
              to={to}
              stops={stops}
              duration={duration}
              dayOffset={outOffset}
            />
          ) : null}

          {showReturn && hasReturn ? (
            <LegRow
              checked={picked}
              onToggle={togglePick}
              logo={returnLogo}
              code={returnCode || code}
              isReturn
              dep={retDep}
              arr={retArr}
              from={retFrom}
              to={retTo}
              stops={returnStops}
              duration={returnDuration || "—"}
              dayOffset={retOffset}
            />
          ) : null}
        </div>
      </div>

      <div className="shop-ticket-side">
        <div className="shop-ticket-bags">
          {hasCabin ? <span title="حقيبة مقصورة">✓ 🎒</span> : <span className="off">🎒</span>}
          {hasChecked ? <span title="حقيبة مسجّلة">✓ 🧳</span> : <span className="off">🧳</span>}
        </div>
        <strong className="shop-ticket-price">
          {priceFrom ? "من " : ""}
          {formatMoneyMinor(flight.sellAmountMinor, flight.currency)}
        </strong>
        <small className="shop-ticket-price-note">يشمل الضرائب والرسوم</small>
        <button type="button" className="shop-ticket-details-btn" onClick={onViewDetails}>
          {selectLabel || "اختر"}
        </button>
      </div>
    </article>
  );
}
