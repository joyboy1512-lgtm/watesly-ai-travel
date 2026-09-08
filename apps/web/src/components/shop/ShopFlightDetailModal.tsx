"use client";

import { useEffect } from "react";
import { formatMoneyMinor } from "@/lib/format";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  formatMinutesLabel,
  getReturnSegments,
  getSegments,
  layoverMinutes,
  stopsLabel,
  type FlightOfferRow,
  type FlightSeg,
} from "@/lib/flight-search";

type Props = {
  flight: FlightOfferRow;
  origin: string;
  destination: string;
  originLabel?: string;
  destinationLabel?: string;
  cabinClass?: string;
  onClose: () => void;
  onContinue: () => void;
};

function Timeline({
  segs,
  from,
  to,
  fallbackDate,
  fromLabel,
  toLabel,
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
  fromLabel?: string;
  toLabel?: string;
}) {
  if (!segs.length) {
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{from}</strong>
            <p>{fromLabel || "مغادرة"}</p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{to}</strong>
            <p>{toLabel || "وصول"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (segs.length === 1) {
    const seg = segs[0]!;
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>
              {formatDay(seg.departAt || seg.date || fallbackDate)} ·{" "}
              {formatClock(seg.departAt || seg.departTime)}
            </strong>
            <p>
              {String(seg.from || from)}
              {fromLabel ? ` · ${fromLabel}` : ""}
            </p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>
              {formatDay(seg.arriveAt || seg.date || fallbackDate)} ·{" "}
              {formatClock(seg.arriveAt || seg.arriveTime)}
            </strong>
            <p>
              {String(seg.to || to)}
              {toLabel ? ` · ${toLabel}` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-flight-timeline">
      {segs.map((seg, idx) => {
        const segFrom = String(seg.from || (idx === 0 ? from : ""));
        const segTo = String(seg.to || (idx === segs.length - 1 ? to : ""));
        const segDepAt = seg.departAt || seg.departTime || "";
        const segArrAt = seg.arriveAt || seg.arriveTime || "";
        const nextSeg = segs[idx + 1];
        const layover = nextSeg
          ? layoverMinutes(segArrAt, nextSeg.departAt || nextSeg.departTime)
          : null;
        return (
          <div key={idx} className="shop-flight-timeline-segment">
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>
                  {formatDay(segDepAt || seg.date || fallbackDate)} · {formatClock(segDepAt)}
                </strong>
                <p>
                  {segFrom} · مغادرة
                  {seg.flightNumber ? ` · رحلة ${seg.flightNumber}` : ""}
                </p>
              </div>
            </div>
            <div className="shop-flight-timeline-line" />
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>{formatClock(segArrAt)}</strong>
                <p>{segTo} · وصول</p>
              </div>
            </div>
            {nextSeg ? (
              <div className="shop-flight-timeline-layover">
                توقف في {segTo}
                {layover ? ` · ${formatMinutesLabel(layover)}` : ""}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ShopFlightDetailModal({
  flight,
  origin,
  destination,
  originLabel,
  destinationLabel,
  cabinClass,
  onClose,
  onContinue,
}: Props) {
  const segs = getSegments(flight.details);
  const returnSegs = getReturnSegments(flight.details);
  const first = segs[0];
  const last = segs[segs.length - 1] || first;
  const retFirst = returnSegs[0];
  const retLast = returnSegs[returnSegs.length - 1] || retFirst;
  const stops = Number(flight.details.stops || Math.max(0, segs.length - 1) || 0);
  const returnStops = Math.max(0, returnSegs.length - 1);
  const code = String(flight.details.airlineCode || "");
  const logo = airlineLogo(code);
  const to = String(last?.to || flight.details.to || destination);
  const from = String(first?.from || flight.details.from || origin);
  const cabin = String(flight.details.cabin || cabinClass || "economy");
  const duration = String(flight.details.duration || "—");
  const returnDuration = String(flight.details.returnDuration || "—");
  const flightNo = String(
    first?.flightNumber ||
      segs.map((s) => s.flightNumber).filter(Boolean).join(" / ") ||
      "—",
  );
  const returnFlightNo = String(
    retFirst?.flightNumber ||
      returnSegs.map((s) => s.flightNumber).filter(Boolean).join(" / ") ||
      "—",
  );
  const baggage = (flight.details.baggage || {}) as Record<string, string>;
  const policies = (flight.details.policies || {}) as Record<string, unknown>;
  const fare = (flight.details.fare || {}) as Record<string, unknown>;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="shop-flight-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="shop-flight-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-flight-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shop-flight-modal-head">
          <div>
            <h2 id="shop-flight-modal-title">تفاصيل الرحلة · {from} → {to}</h2>
            <div className="shop-flight-modal-actions">
              <button type="button" className="shop-flight-modal-share" aria-label="حفظ">
                ♡ حفظ
              </button>
              <button type="button" className="shop-flight-modal-share" aria-label="مشاركة">
                ↗ مشاركة
              </button>
            </div>
          </div>
          <button
            type="button"
            className="shop-flight-modal-close"
            aria-label="إغلاق"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <section className="shop-flight-modal-section">
          <h3>
            {from} → {to}
            <span>
              {stopsLabel(stops)} · {duration}
            </span>
          </h3>
          <div className="shop-flight-modal-itinerary">
            <Timeline
              segs={segs}
              from={from}
              to={to}
              fromLabel={originLabel}
              toLabel={destinationLabel}
            />
            <div className="shop-flight-modal-carrier">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={code} />
              ) : (
                <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
              )}
              <strong>
                {String(flight.details.airlineAr || flight.details.airline || "شركة طيران")}
              </strong>
              <span>
                {flightNo} · {cabinLabel(cabin)}
              </span>
              <span>مدة الرحلة {duration}</span>
            </div>
          </div>
        </section>

        {returnSegs.length > 0 ? (
          <section className="shop-flight-modal-section">
            <h3>
              {String(retFirst?.from || to)} → {String(retLast?.to || from)}
              <span>
                {stopsLabel(returnStops)} · {returnDuration}
              </span>
            </h3>
            <div className="shop-flight-modal-itinerary">
              <Timeline
                segs={returnSegs}
                from={String(retFirst?.from || to)}
                to={String(retLast?.to || from)}
                fromLabel={destinationLabel}
                toLabel={originLabel}
              />
              <div className="shop-flight-modal-carrier">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={code} />
                ) : (
                  <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
                )}
                <strong>
                  {String(
                    retFirst?.airline ||
                      flight.details.airlineAr ||
                      flight.details.airline ||
                      "شركة طيران",
                  )}
                </strong>
                <span>
                  {returnFlightNo} · {cabinLabel(cabin)}
                </span>
                <span>مدة الرحلة {returnDuration}</span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="shop-flight-modal-section split">
          <div>
            <h3>الأمتعة</h3>
            <p>إجمالي الأمتعة المشمولة في السعر</p>
          </div>
          <ul className="shop-flight-modal-list">
            <li>
              <span>حقيبة شخصية</span>
              <em>{baggage.personal || "مشمولة"}</em>
            </li>
            <li>
              <span>حقيبة مقصورة</span>
              <em>{baggage.cabin || "مشمولة"}</em>
            </li>
            <li>
              <span>حقيبة مسجّلة</span>
              <em>{baggage.checked || "متاحة لاحقاً مقابل رسوم"}</em>
            </li>
          </ul>
        </section>

        <section className="shop-flight-modal-section split">
          <div>
            <h3>قواعد التذكرة</h3>
            <p>معلومات مفيدة عن السياسة</p>
          </div>
          <ul className="shop-flight-modal-list soft">
            <li>
              <span>
                {policies.changeable
                  ? "يمكنك تغيير هذه الرحلة مقابل رسوم"
                  : "تغيير الرحلة قد يكون محدوداً حسب قواعد الأجرة"}
              </span>
            </li>
            {policies.noteAr ? (
              <li>
                <span>{String(policies.noteAr)}</span>
              </li>
            ) : null}
            {fare.baseAmountMinor != null ? (
              <li>
                <span>
                  الأجرة الأساسية{" "}
                  {formatMoneyMinor(Number(fare.baseAmountMinor), String(fare.currency || flight.currency))}
                </span>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="shop-flight-modal-section split">
          <div>
            <h3>إضافات قد تعجبك</h3>
            <p>يمكن إضافتها مقابل رسوم</p>
          </div>
          <ul className="shop-flight-modal-list soft">
            <li>
              <span>حقيبة مسجّلة</span>
              <em>متاحة في الخطوات التالية</em>
            </li>
            <li>
              <span>تذكرة مرنة</span>
              <em>متاحة في الخطوات التالية</em>
            </li>
          </ul>
        </section>

        <footer className="shop-flight-modal-foot">
          <strong>{formatMoneyMinor(flight.sellAmountMinor, flight.currency)}</strong>
          <button type="button" className="shop-flight-continue-btn" onClick={onContinue}>
            اختيار هذه الرحلة
          </button>
        </footer>
      </div>
    </div>
  );
}
