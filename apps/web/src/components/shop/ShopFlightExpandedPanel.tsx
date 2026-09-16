"use client";

import { useEffect, useMemo, useState } from "react";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  listFareOptionsFromDetails,
  pickDefaultFareOption,
  type FlightFareOption,
} from "@watesly-travel/shared";
import { airlineNameAr } from "@/lib/flight-airlines";
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
}: {
  segs: FlightSeg[];
  from: string;
  to: string;
  fallbackDate?: string;
  packageCode: string;
}) {
  if (!segs.length) {
    return (
      <div className="shop-flight-timeline">
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{from}</strong>
            <p>مغادرة</p>
          </div>
        </div>
        <div className="shop-flight-timeline-line" />
        <div className="shop-flight-timeline-point">
          <i />
          <div>
            <strong>{to}</strong>
            <p>وصول</p>
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
        const name = airlineNameAr(code, seg.airline);

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
                  {seg.flightNumber ? `رحلة ${seg.flightNumber}` : code}
                  {seg.aircraft ? ` · ${seg.aircraft}` : ""}
                </span>
              </div>
            </div>
            <div className="shop-flight-timeline-point">
              <i />
              <div>
                <strong>
                  {formatDay(segDepAt || seg.date || fallbackDate)} · {formatClock(segDepAt)}
                </strong>
                <p>{segFrom} · مغادرة</p>
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
                ترانزيت في {segTo}
                {layover ? ` · ${formatMinutesLabel(layover)}` : ""}
                {nextSeg.from && nextSeg.from !== segTo ? " · تغيير مطار" : ""}
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
}: {
  leg: SelectedLeg;
  title: string;
  fallbackDate?: string;
  packageCode: string;
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
            {leg.airlineName} · {stopsLabel(leg.stops)} · {leg.durationLabel}
          </span>
        </div>
      </header>
      <SegmentTimeline
        segs={leg.segments}
        from={leg.from}
        to={leg.to}
        fallbackDate={fallbackDate}
        packageCode={packageCode}
      />
      <ul className="shop-flight-leg-baggage">
        <li>🎒 {bag.cabin || bag.personal || "حقيبة مقصورة حسب الفئة"}</li>
        <li>🧳 {bag.checked || "الأمتعة المسجّلة حسب الفئة المختارة"}</li>
      </ul>
      <footer className="shop-flight-expanded-leg-foot">
        <span>{leg.flightNumbers || "—"}</span>
        <span>إجمالي مدة الرحلة {leg.durationLabel}</span>
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
  const { currency: displayCurrency, formatMoney } = useShopCopy();
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
            <h2 id="shop-flight-expanded-title">تفاصيل الرحلة · {titleRoute}</h2>
            <p>
              {formatDay(departDate)}
              {returnDate ? ` – ${formatDay(returnDate)}` : ""}
              {" · "}
              {passengers} مسافر · {cabinLabel(cabinClass)}
              {trip.isMixMatch ? " · تركيبة مخصصة" : ""}
            </p>
          </div>
          <button type="button" className="shop-flight-modal-close" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="shop-flight-expanded-body">
          <LegSection
            leg={trip.outbound}
            title="رحلة الذهاب"
            fallbackDate={departDate}
            packageCode={packageCode}
          />
          {trip.return ? (
            <LegSection
              leg={trip.return}
              title="رحلة العودة"
              fallbackDate={returnDate}
              packageCode={trip.return.airlineCode || packageCode}
            />
          ) : null}

          {fareOptions.length > 1 ? (
            <section className="shop-flight-fare-families">
              <h3>فئات التذكرة</h3>
              <p className="shop-flight-fare-families-hint">
                فئات شركة الطيران لهذه الرحلة — مثل Economy / Flex / Comfort أو Saver / Flexi /
                Business Saver حسب ما يتوفر
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
                          {arHint}
                          {arHint !== fare.cabinLabelAr ? ` · ${fare.cabinLabelAr}` : ""}
                        </span>
                      </header>
                      <em data-display-currency={displayCurrency}>
                        {formatMoney(fare.sellAmountMinor, fare.currency || trip.currency)}
                      </em>
                      <ul>
                        {fare.cabinBag ? <li>🎒 {fare.cabinBag}</li> : null}
                        {fare.checkedBag ? <li>🧳 {fare.checkedBag}</li> : null}
                        {fare.changeNoteAr ? <li>{fare.changeNoteAr}</li> : null}
                        {fare.refundNoteAr ? <li>{fare.refundNoteAr}</li> : null}
                        {fare.noteAr ? <li>{fare.noteAr}</li> : null}
                        {fare.refundable == null && fare.changeable == null && !fare.changeNoteAr ? (
                          <li>شروط التذكرة حسب شركة الطيران</li>
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
                الإجمالي
                {selectedFare ? ` · ${selectedFare.brandNameAr}` : ""}
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
            {`متابعة — ${formatMoney(sellPriceMinor, trip.currency)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
