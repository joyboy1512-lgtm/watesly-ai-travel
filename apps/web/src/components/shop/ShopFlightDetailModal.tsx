"use client";

import { useEffect } from "react";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  formatMinutesLabel,
  flightAirlineNameAr,
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
  locale,
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
  fromLabel?: string;
  toLabel?: string;
  locale: "ar" | "en";
}) {
  if (!segs.length) {
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{from}</strong>
            <p>{fromLabel || (locale === "en" ? "Departure" : "مغادرة")}</p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{to}</strong>
            <p>{toLabel || (locale === "en" ? "Arrival" : "وصول")}</p>
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
              {formatDay(seg.departAt || seg.date || fallbackDate, locale)} ·{" "}
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
              {formatDay(seg.arriveAt || seg.date || fallbackDate, locale)} ·{" "}
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
                  {formatDay(segDepAt || seg.date || fallbackDate, locale)} ·{" "}
                  {formatClock(segDepAt)}
                </strong>
                <p>
                  {segFrom} · {locale === "en" ? "Departure" : "مغادرة"}
                  {seg.flightNumber
                    ? ` · ${locale === "en" ? "Flight" : "رحلة"} ${seg.flightNumber}`
                    : ""}
                </p>
              </div>
            </div>
            <div className="shop-flight-timeline-line" />
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>{formatClock(segArrAt)}</strong>
                <p>{segTo} · {locale === "en" ? "Arrival" : "وصول"}</p>
              </div>
            </div>
            {nextSeg ? (
              <div className="shop-flight-timeline-layover">
                {locale === "en" ? "Layover in" : "توقف في"} {segTo}
                {layover ? ` · ${formatMinutesLabel(layover, locale)}` : ""}
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
  const { locale, currency: displayCurrency, formatMoney } = useShopCopy();
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
  const airlineName = flightAirlineNameAr(flight.details, first, "out", locale);
  const returnAirlineName = flightAirlineNameAr(
    flight.details,
    retFirst,
    "return",
    locale,
  );
  const localizedBag = (value: string | undefined, fallbackAr: string, fallbackEn: string) => {
    if (locale === "ar") return value || fallbackAr;
    if (!value || /[\u0600-\u06FF]/.test(value)) {
      const weight = value?.match(/\d+(?:\.\d+)?/)?.[0];
      return weight ? `${weight} kg` : fallbackEn;
    }
    return value;
  };
  const localizedDuration = (value: string) =>
    locale === "en"
      ? value.replace(/(\d+)\s*س/g, "$1h").replace(/(\d+)\s*د/g, "$1m")
      : value;

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
            <h2 id="shop-flight-modal-title">
              {locale === "en" ? "Flight details" : "تفاصيل الرحلة"} · {from} → {to}
            </h2>
            <div className="shop-flight-modal-actions">
              <button
                type="button"
                className="shop-flight-modal-share"
                aria-label={locale === "en" ? "Save" : "حفظ"}
              >
                ♡ {locale === "en" ? "Save" : "حفظ"}
              </button>
              <button
                type="button"
                className="shop-flight-modal-share"
                aria-label={locale === "en" ? "Share" : "مشاركة"}
              >
                ↗ {locale === "en" ? "Share" : "مشاركة"}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="shop-flight-modal-close"
            aria-label={locale === "en" ? "Close" : "إغلاق"}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <section className="shop-flight-modal-section">
          <h3>
            {from} → {to}
            <span>
              {stopsLabel(stops, locale)} · {localizedDuration(duration)}
            </span>
          </h3>
          <div className="shop-flight-modal-itinerary">
            <Timeline
              segs={segs}
              from={from}
              to={to}
              fromLabel={originLabel}
              toLabel={destinationLabel}
              locale={locale}
            />
            <div className="shop-flight-modal-carrier">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={code} />
              ) : (
                <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
              )}
              <strong>{airlineName}</strong>
              <span>
                {flightNo} · {cabinLabel(cabin, locale)}
              </span>
              <span>
                {locale === "en" ? "Flight duration" : "مدة الرحلة"}{" "}
                {localizedDuration(duration)}
              </span>
            </div>
          </div>
        </section>

        {returnSegs.length > 0 ? (
          <section className="shop-flight-modal-section">
            <h3>
              {String(retFirst?.from || to)} → {String(retLast?.to || from)}
              <span>
                {stopsLabel(returnStops, locale)} · {localizedDuration(returnDuration)}
              </span>
            </h3>
            <div className="shop-flight-modal-itinerary">
              <Timeline
                segs={returnSegs}
                from={String(retFirst?.from || to)}
                to={String(retLast?.to || from)}
                fromLabel={destinationLabel}
                toLabel={originLabel}
                locale={locale}
              />
              <div className="shop-flight-modal-carrier">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo} alt={code} />
                ) : (
                  <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
                )}
                <strong>{returnAirlineName}</strong>
                <span>
                  {returnFlightNo} · {cabinLabel(cabin, locale)}
                </span>
                <span>
                  {locale === "en" ? "Flight duration" : "مدة الرحلة"}{" "}
                  {localizedDuration(returnDuration)}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="shop-flight-modal-section split">
          <div>
            <h3>{locale === "en" ? "Baggage" : "الأمتعة"}</h3>
            <p>
              {locale === "en"
                ? "Total baggage included in the price"
                : "إجمالي الأمتعة المشمولة في السعر"}
            </p>
          </div>
          <ul className="shop-flight-modal-list">
            <li>
              <span>{locale === "en" ? "Personal item" : "حقيبة شخصية"}</span>
              <em>{localizedBag(baggage.personal, "مشمولة", "Included")}</em>
            </li>
            <li>
              <span>{locale === "en" ? "Cabin bag" : "حقيبة مقصورة"}</span>
              <em>{localizedBag(baggage.cabin, "مشمولة", "Included")}</em>
            </li>
            <li>
              <span>{locale === "en" ? "Checked bag" : "حقيبة مسجّلة"}</span>
              <em>
                {localizedBag(
                  baggage.checked,
                  "متاحة لاحقاً مقابل رسوم",
                  "Available later for a fee",
                )}
              </em>
            </li>
          </ul>
        </section>

        <section className="shop-flight-modal-section split">
          <div>
            <h3>{locale === "en" ? "Fare rules" : "قواعد التذكرة"}</h3>
            <p>
              {locale === "en" ? "Useful policy information" : "معلومات مفيدة عن السياسة"}
            </p>
          </div>
          <ul className="shop-flight-modal-list soft">
            <li>
              <span>
                {policies.changeable
                  ? locale === "en"
                    ? "You can change this flight for a fee"
                    : "يمكنك تغيير هذه الرحلة مقابل رسوم"
                  : locale === "en"
                    ? "Changes may be limited by the fare rules"
                    : "تغيير الرحلة قد يكون محدوداً حسب قواعد الأجرة"}
              </span>
            </li>
            {(locale === "en" ? policies.noteEn : policies.noteAr) ? (
              <li>
                <span>{String(locale === "en" ? policies.noteEn : policies.noteAr)}</span>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="shop-flight-modal-section split">
          <div>
            <h3>{locale === "en" ? "Optional extras" : "إضافات قد تعجبك"}</h3>
            <p>{locale === "en" ? "Available for an additional fee" : "يمكن إضافتها مقابل رسوم"}</p>
          </div>
          <ul className="shop-flight-modal-list soft">
            <li>
              <span>{locale === "en" ? "Checked bag" : "حقيبة مسجّلة"}</span>
              <em>{locale === "en" ? "Available in the next steps" : "متاحة في الخطوات التالية"}</em>
            </li>
            <li>
              <span>{locale === "en" ? "Flexible ticket" : "تذكرة مرنة"}</span>
              <em>{locale === "en" ? "Available in the next steps" : "متاحة في الخطوات التالية"}</em>
            </li>
          </ul>
        </section>

        <footer className="shop-flight-modal-foot">
          <strong data-display-currency={displayCurrency}>
            {formatMoney(flight.sellAmountMinor, flight.currency)}
          </strong>
          <button type="button" className="shop-flight-continue-btn" onClick={onContinue}>
            {locale === "en" ? "Select this flight" : "اختيار هذه الرحلة"}
          </button>
        </footer>
      </div>
    </div>
  );
}
