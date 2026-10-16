"use client";

import { useEffect, useMemo, useState } from "react";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  listFareOptionsFromDetails,
  pickDefaultFareOption,
  type FlightFareOption,
} from "@watesly-travel/shared";
import { airlineName } from "@/lib/flight-airlines";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  formatMinutesLabel,
  layoverMinutes,
  segmentAirlineCode,
  stopsLabel,
  type FlightSeg,
} from "@/lib/flight-search";
import type { SelectedLeg } from "@/lib/flight-leg-selection";

type Props = {
  trip: ComposedTrip;
  passengers: number;
  cabinClass: string;
  departDate: string;
  returnDate?: string;
  originLabel?: string;
  destinationLabel?: string;
  onClose: () => void;
  onContinueReview: (payload: {
    totalPriceMinor: number;
    fareOfferId?: string;
    fare?: FlightFareOption;
  }) => void;
};

function SegmentTimeline({
  segs,
  from,
  to,
  fallbackDate,
  packageCode,
  locale,
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
  packageCode: string;
  locale: "ar" | "en";
}) {
  if (!segs.length) {
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{from}</strong>
            <p>{locale === "en" ? "Departure" : "مغادرة"}</p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{to}</strong>
            <p>{locale === "en" ? "Arrival" : "وصول"}</p>
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
        const code = segmentAirlineCode(seg, packageCode);
        const logo = airlineLogo(code, 64);
        const name = airlineName(code, seg.airline, locale);

        return (
          <div key={idx} className="shop-flight-timeline-segment">
            <div className="shop-flight-expanded-seg-head">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={name} className="shop-flight-expanded-seg-logo" width={32} height={32} />
              ) : (
                <div className="shop-ticket-logo-fallback">{code || "✈"}</div>
              )}
              <div>
                <strong>{name}</strong>
                <span>
                  {seg.flightNumber
                    ? `${locale === "en" ? "Flight" : "رحلة"} ${seg.flightNumber}`
                    : code}
                  {seg.aircraft ? ` · ${seg.aircraft}` : ""}
                </span>
              </div>
            </div>
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>
                  {formatDay(segDepAt || seg.date || fallbackDate, locale)} ·{" "}
                  {formatClock(segDepAt)}
                </strong>
                <p>{segFrom} · {locale === "en" ? "Departure" : "مغادرة"}</p>
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
                {locale === "en" ? "Layover in" : "ترانزيت في"} {segTo}
                {layover ? ` · ${formatMinutesLabel(layover, locale)}` : ""}
                {nextSeg.from && nextSeg.from !== segTo
                  ? locale === "en"
                    ? " · Airport change"
                    : " · تغيير مطار"
                  : ""}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LegSection({
  leg,
  title,
  fallbackDate,
  packageCode,
  locale,
}: {
  leg: SelectedLeg;
  title: string;
  fallbackDate?: string;
  packageCode: string;
  locale: "ar" | "en";
}) {
  const logo = airlineLogo(leg.airlineCode, 64);
  const bag = leg.baggage;
  return (
    <section className="shop-flight-expanded-leg">
      <header className="shop-flight-expanded-leg-head">
        <div>
          <h3>{title}</h3>
          <p>
            {leg.from} → {leg.to}
          </p>
        </div>
        <div className="shop-flight-expanded-leg-meta">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={leg.airlineName} width={36} height={36} />
          ) : (
            <div className="shop-ticket-logo-fallback">{leg.airlineCode || "✈"}</div>
          )}
          <span>
            {airlineName(leg.airlineCode, leg.airlineName, locale)} ·{" "}
            {stopsLabel(leg.stops, locale)} ·{" "}
            {locale === "en"
              ? leg.durationLabel.replace(/(\d+)\s*س/g, "$1h").replace(/(\d+)\s*د/g, "$1m")
              : leg.durationLabel}
          </span>
        </div>
      </header>
      <SegmentTimeline
        segs={leg.segments}
        from={leg.from}
        to={leg.to}
        fallbackDate={fallbackDate}
        packageCode={packageCode}
        locale={locale}
      />
      <ul className="shop-flight-leg-baggage">
        <li>
          🎒{" "}
          {locale === "en"
            ? bag.cabin || bag.personal
              ? String(bag.cabin || bag.personal).replace("كجم", "kg")
              : "Cabin baggage depends on the fare"
            : bag.cabin || bag.personal || "حقيبة مقصورة حسب الفئة"}
        </li>
        <li>
          🧳{" "}
          {locale === "en"
            ? bag.checked
              ? String(bag.checked).replace("كجم", "kg")
              : "Checked baggage depends on the selected fare"
            : bag.checked || "الأمتعة المسجّلة حسب الفئة المختارة"}
        </li>
      </ul>
      <footer className="shop-flight-expanded-leg-foot">
        <span>{leg.flightNumbers || "—"}</span>
        <span>
          {locale === "en" ? "Total flight duration" : "إجمالي مدة الرحلة"}{" "}
          {locale === "en"
            ? leg.durationLabel.replace(/(\d+)\s*س/g, "$1h").replace(/(\d+)\s*د/g, "$1m")
            : leg.durationLabel}
        </span>
      </footer>
    </section>
  );
}

export function ShopFlightExpandedPanel({
  trip,
  passengers,
  cabinClass,
  departDate,
  returnDate,
  onClose,
  onContinueReview,
}: Props) {
  const { locale, currency: displayCurrency, formatMoney } = useShopCopy();
  const packageCode = trip.outbound.airlineCode;
  const fareOptions = useMemo(
    () => listFareOptionsFromDetails(trip.sourcePackage?.details),
    [trip.sourcePackage?.details],
  );
  const defaultFare = pickDefaultFareOption(
    fareOptions,
    trip.sourcePackage?.id,
    cabinClass,
  );
  const [selectedFareId, setSelectedFareId] = useState(
    defaultFare?.id || trip.sourcePackage?.id || trip.id,
  );
  const selectedFare =
    fareOptions.find((fare) => fare.id === selectedFareId) || defaultFare || null;
  const sellPriceMinor = selectedFare?.sellAmountMinor ?? trip.totalPriceMinor;

  useEffect(() => {
    const next = pickDefaultFareOption(fareOptions, trip.sourcePackage?.id, cabinClass);
    if (next && next.id !== selectedFareId && !fareOptions.some((fare) => fare.id === selectedFareId)) {
      setSelectedFareId(next.id);
    }
  }, [fareOptions, selectedFareId, trip.sourcePackage?.id, cabinClass]);

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

  const titleRoute = `${trip.outbound.from} ↔ ${trip.outbound.to}`;

  return (
    <div className="shop-flight-expanded-backdrop" onClick={onClose} role="presentation">
      <div
        className="shop-flight-expanded-panel has-sticky-foot"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-flight-expanded-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shop-flight-expanded-head">
          <div>
            <h2 id="shop-flight-expanded-title">
              {locale === "en" ? "Flight details" : "تفاصيل الرحلة"} · {titleRoute}
            </h2>
            <p>
              {formatDay(departDate, locale)}
              {returnDate ? ` – ${formatDay(returnDate, locale)}` : ""}
              {" · "}
              {passengers} {locale === "en" ? (passengers === 1 ? "traveler" : "travelers") : "مسافر"}{" "}
              · {cabinLabel(cabinClass, locale)}
              {trip.isMixMatch
                ? locale === "en"
                  ? " · Custom combination"
                  : " · تركيبة مخصصة"
                : ""}
            </p>
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

        <div className="shop-flight-expanded-body">
          <LegSection
            leg={trip.outbound}
            title={locale === "en" ? "Outbound flight" : "رحلة الذهاب"}
            fallbackDate={departDate}
            packageCode={packageCode}
            locale={locale}
          />
          {trip.return ? (
            <LegSection
              leg={trip.return}
              title={locale === "en" ? "Return flight" : "رحلة العودة"}
              fallbackDate={returnDate}
              packageCode={trip.return.airlineCode || packageCode}
              locale={locale}
            />
          ) : null}

          {fareOptions.length > 1 ? (
            <section className="shop-flight-fare-families">
              <h3>{locale === "en" ? "Fare options" : "فئات التذكرة"}</h3>
              <p className="shop-flight-fare-families-hint">
                {locale === "en"
                  ? "Available airline fare options for this flight, such as Economy, Flex, Comfort, Saver, Flexi, or Business Saver."
                  : "فئات شركة الطيران لهذه الرحلة — مثل Economy / Flex / Comfort أو Saver / Flexi / Business Saver حسب ما يتوفر"}
              </p>
              <div className="shop-flight-fare-family-grid">
                {fareOptions.map((fare) => {
                  const selected = fare.id === selectedFare?.id;
                  const arHint = fare.brandNameAr.includes("·")
                    ? fare.brandNameAr.split("·").pop()!.trim()
                    : fare.cabinLabelAr;
                  return (
                    <button
                      key={fare.id}
                      type="button"
                      className={`shop-flight-fare-family-card${selected ? " selected" : ""}`}
                      onClick={() => setSelectedFareId(fare.id)}
                    >
                      <header>
                        <strong>{fare.brandName}</strong>
                        <span>
                          {locale === "en" ? cabinLabel(fare.cabin, "en") : arHint}
                          {locale === "ar" && arHint !== fare.cabinLabelAr
                            ? ` · ${fare.cabinLabelAr}`
                            : ""}
                        </span>
                      </header>
                      <em data-display-currency={displayCurrency}>
                        {formatMoney(fare.sellAmountMinor, fare.currency || trip.currency)}
                      </em>
                      <ul>
                        {fare.cabinBag ? (
                          <li>🎒 {locale === "en" ? fare.cabinBag.replace("كجم", "kg") : fare.cabinBag}</li>
                        ) : null}
                        {fare.checkedBag ? (
                          <li>🧳 {locale === "en" ? fare.checkedBag.replace("كجم", "kg") : fare.checkedBag}</li>
                        ) : null}
                        {locale === "ar" && fare.changeNoteAr ? <li>{fare.changeNoteAr}</li> : null}
                        {locale === "ar" && fare.refundNoteAr ? <li>{fare.refundNoteAr}</li> : null}
                        {locale === "ar" && fare.noteAr ? <li>{fare.noteAr}</li> : null}
                        {locale === "en" && fare.changeable != null ? (
                          <li>{fare.changeable ? "Changes permitted" : "Changes not permitted"}</li>
                        ) : null}
                        {locale === "en" && fare.refundable != null ? (
                          <li>{fare.refundable ? "Refundable" : "Non-refundable"}</li>
                        ) : null}
                        {fare.refundable == null && fare.changeable == null && !fare.changeNoteAr ? (
                          <li>
                            {locale === "en"
                              ? "Fare conditions are set by the airline"
                              : "شروط التذكرة حسب شركة الطيران"}
                          </li>
                        ) : null}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="shop-flight-expanded-foot sticky">
          <div className="shop-flight-expanded-foot-breakdown">
            <div className="total">
              <span>
                {locale === "en" ? "Total" : "الإجمالي"}
                {selectedFare
                  ? ` · ${locale === "en" ? selectedFare.brandName : selectedFare.brandNameAr}`
                  : ""}
              </span>
              <strong data-display-currency={displayCurrency}>
                {formatMoney(sellPriceMinor, trip.currency)}
              </strong>
            </div>
          </div>
          <button
            type="button"
            className="shop-flight-expanded-continue-btn"
            onClick={() =>
              onContinueReview({
                totalPriceMinor: sellPriceMinor,
                fareOfferId: selectedFare?.id,
                fare: selectedFare || undefined,
              })
            }
          >
            {`${locale === "en" ? "Continue" : "متابعة"} — ${formatMoney(
              sellPriceMinor,
              trip.currency,
            )}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
