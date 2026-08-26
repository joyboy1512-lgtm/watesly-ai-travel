"use client";

import { formatMoneyMinor } from "@/lib/format";
import {
  airlineLogo,
  formatClock,
  formatDay,
  formatMinutesLabel,
  getReturnSegments,
  getSegments,
  layoverMinutes,
  stopsLabel,
  type FlightOfferRow,
} from "@/lib/flight-search";

type Props = {
  flight: FlightOfferRow;
  originFallback?: string;
  destinationFallback?: string;
  onViewDetails: () => void;
  badges?: Array<"best" | "cheapest" | "fastest">;
  selectLabel?: string;
};

const BADGE_LABEL: Record<"best" | "cheapest" | "fastest", string> = {
  best: "الأفضل",
  cheapest: "الأرخص",
  fastest: "الأسرع",
};

export function ShopFlightCard({
  flight,
  originFallback = "",
  destinationFallback = "",
  onViewDetails,
  badges = [],
  selectLabel,
}: Props) {
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
  const duration = String(flight.details.duration || "—");
  const returnDurationMins = layoverMinutes(
    retFirst?.departAt || retFirst?.departTime,
    retLast?.arriveAt || retLast?.arriveTime,
  );
  const returnDuration =
    String(flight.details.returnDuration || "") ||
    (returnDurationMins != null
      ? formatMinutesLabel(returnDurationMins)
      : returnSegs.length
        ? "—"
        : "");
  const isFlexible = Boolean(flight.details.flexible);
  const hasReturn = returnSegs.length > 0;
  const baggage = (flight.details.baggage || {}) as Record<string, string>;
  const hasCabin = Boolean(baggage.cabin || baggage.personal);
  const hasChecked = Boolean(baggage.checked && !/غير|بدون|none|no /i.test(baggage.checked));

  const dep = formatClock(first?.departAt || first?.departTime || String(flight.details.departAt || ""));
  const arr = formatClock(last?.arriveAt || last?.arriveTime || String(flight.details.arriveAt || ""));
  const depDay = formatDay(first?.departAt || first?.date || String(flight.details.departAt || ""));
  const arrDay = formatDay(last?.arriveAt || last?.date || String(flight.details.arriveAt || ""));
  const from = String(first?.from || flight.details.legOrigin || flight.details.from || originFallback);
  const to = String(last?.to || flight.details.legDestination || flight.details.to || destinationFallback);
  const retDep = formatClock(retFirst?.departAt || retFirst?.departTime || "");
  const retArr = formatClock(retLast?.arriveAt || retLast?.arriveTime || "");
  const retDepDay = formatDay(retFirst?.departAt || retFirst?.date || "");
  const retArrDay = formatDay(retLast?.arriveAt || retLast?.date || "");
  const retFrom = String(retFirst?.from || to);
  const retTo = String(retLast?.to || from);
  const legLabel = String(flight.details.legLabel || "");

  return (
    <article className="shop-ticket-card">
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
        <div className="shop-ticket-legs">
          <div className="shop-ticket-leg">
            <div className="shop-ticket-carrier">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={code} />
              ) : (
                <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
              )}
              {hasReturn || legLabel ? (
                <span className="shop-ticket-leg-label">{legLabel || "الذهاب"}</span>
              ) : null}
            </div>
            <div className="shop-ticket-time">
              <strong>{dep}</strong>
              <span>
                {from}
                {depDay ? ` · ${depDay}` : ""}
              </span>
            </div>
            <div className="shop-ticket-path">
              <div className="shop-ticket-path-line">
                <i className="shop-ticket-path-bar" />
              </div>
              <div className="shop-ticket-meta">
                <span className={`shop-ticket-meta-stops${stops === 0 ? " direct" : ""}`}>
                  {stopsLabel(stops)}
                </span>
                <span className="shop-ticket-meta-duration">{duration}</span>
              </div>
            </div>
            <div className="shop-ticket-time end">
              <strong>{arr}</strong>
              <span>
                {to}
                {arrDay ? ` · ${arrDay}` : ""}
              </span>
            </div>
          </div>

          {hasReturn ? (
            <div className="shop-ticket-leg shop-ticket-leg-return">
              <div className="shop-ticket-carrier">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={code} />
                ) : (
                  <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
                )}
                <span className="shop-ticket-leg-label return">العودة</span>
              </div>
              <div className="shop-ticket-time">
                <strong>{retDep}</strong>
                <span>
                  {retFrom}
                  {retDepDay ? ` · ${retDepDay}` : ""}
                </span>
              </div>
              <div className="shop-ticket-path">
                <div className="shop-ticket-path-line">
                  <i className="shop-ticket-path-bar" />
                </div>
                <div className="shop-ticket-meta">
                  <span
                    className={`shop-ticket-meta-stops${returnStops === 0 ? " direct" : ""}`}
                  >
                    {stopsLabel(returnStops)}
                  </span>
                  <span className="shop-ticket-meta-duration">{returnDuration || "—"}</span>
                </div>
              </div>
              <div className="shop-ticket-time end">
                <strong>{retArr}</strong>
                <span>
                  {retTo}
                  {retArrDay ? ` · ${retArrDay}` : ""}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="shop-ticket-footer-row">
          <div className="shop-ticket-airline-name">
            {String(flight.details.airlineAr || flight.details.airline || "شركة طيران")}
            {code ? ` (${code})` : ""}
            {hasReturn ? " · ذهاب وعودة" : ""}
          </div>
        </div>
      </div>

      <div className="shop-ticket-side">
        <div className="shop-ticket-bags">
          {hasCabin ? <span title="حقيبة مقصورة">✓ 🎒</span> : <span className="off">🎒</span>}
          {hasChecked ? <span title="حقيبة مسجّلة">✓ 🧳</span> : <span className="off">🧳</span>}
        </div>
        <strong className="shop-ticket-price">
          {formatMoneyMinor(flight.sellAmountMinor, flight.currency)}
        </strong>
        <small className="shop-ticket-price-note">يشمل الضرائب والرسوم</small>
        <button type="button" className="shop-ticket-details-btn" onClick={onViewDetails}>
          {selectLabel || "عرض التفاصيل"}
        </button>
      </div>
    </article>
  );
}
