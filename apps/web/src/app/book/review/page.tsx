"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  clearBookingDraft,
  getBookingDraft,
  saveFlightDraft,
  type FlightBookingDraft,
} from "@/lib/booking-draft";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  stopsLabel,
} from "@/lib/flight-search";
import { formatMoneyMinor } from "@/lib/format";

export default function BookReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<FlightBookingDraft | null>(null);

  useEffect(() => {
    const loaded = getBookingDraft();
    if (!loaded || loaded.serviceType !== "flight") {
      router.replace("/");
      return;
    }
    setDraft(loaded);
  }, [router]);

  if (!draft) {
    return (
      <StoreFront>
        <div className="shop-flight-review-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>جاري تحميل مراجعة الحجز…</p>
        </div>
      </StoreFront>
    );
  }

  const trip = draft.composedTrip;
  const outbound = draft.selectedOutbound || trip?.outbound;
  const returnLeg = draft.selectedReturn ?? trip?.return ?? null;
  const fare = draft.selectedFare;
  const provider = draft.selectedProvider;
  const breakdown = draft.priceBreakdown;
  const pax = draft.adults + draft.children;

  const totalMinor =
    breakdown?.totalMinor ??
    provider?.totalPriceMinor ??
    fare?.totalPriceMinor ??
    draft.flight.sellAmountMinor;

  function continueToTravelers() {
    const { serviceType: _serviceType, ...payload } = draft;
    saveFlightDraft(payload);
    router.push("/book");
  }

  function backToResults() {
    const href = draft.resultsReturnHref || "/flights/results";
    router.push(href);
  }

  return (
    <StoreFront>
      <div className="shop-flight-review-page">
        <header className="shop-flight-review-head">
          <h1>مراجعة الحجز</h1>
          <p>تأكّد من تفاصيل الرحلة والسعر قبل إدخال بيانات المسافرين</p>
        </header>

        <div className="shop-flight-review-grid">
          <section className="shop-flight-review-card">
            <h2>ملخص الرحلة</h2>
            <p className="shop-flight-review-route">
              {draft.originLabel || draft.origin} ↔ {draft.destinationLabel || draft.destination}
            </p>
            <p className="shop-flight-review-dates">
              {formatDay(draft.departDate)}
              {draft.returnDate ? ` – ${formatDay(draft.returnDate)}` : ""}
              {" · "}
              {pax} مسافر · {cabinLabel(draft.cabinClass)}
            </p>

            {outbound ? (
              <article className="shop-flight-review-leg">
                <h3>رحلة الذهاب</h3>
                <div className="shop-flight-review-leg-row">
                  {airlineLogo(outbound.airlineCode) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={airlineLogo(outbound.airlineCode)!} alt="" />
                  ) : null}
                  <div>
                    <strong>{outbound.airlineName}</strong>
                    <p>
                      {formatClock(outbound.departAt)} {outbound.from} → {outbound.to}{" "}
                      {formatClock(outbound.arriveAt)}
                    </p>
                    <small>
                      {stopsLabel(outbound.stops)} · {outbound.durationLabel}
                      {outbound.flightNumbers ? ` · ${outbound.flightNumbers}` : ""}
                    </small>
                  </div>
                </div>
              </article>
            ) : null}

            {returnLeg ? (
              <article className="shop-flight-review-leg">
                <h3>رحلة العودة</h3>
                <div className="shop-flight-review-leg-row">
                  {airlineLogo(returnLeg.airlineCode) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={airlineLogo(returnLeg.airlineCode)!} alt="" />
                  ) : null}
                  <div>
                    <strong>{returnLeg.airlineName}</strong>
                    <p>
                      {formatClock(returnLeg.departAt)} {returnLeg.from} → {returnLeg.to}{" "}
                      {formatClock(returnLeg.arriveAt)}
                    </p>
                    <small>
                      {stopsLabel(returnLeg.stops)} · {returnLeg.durationLabel}
                      {returnLeg.flightNumbers ? ` · ${returnLeg.flightNumbers}` : ""}
                    </small>
                  </div>
                </div>
              </article>
            ) : null}

            {trip?.isMixMatch ? (
              <p className="shop-flight-review-mix-tag">تركيبة مخصصة (ذهاب + عودة من عروض مختلفة)</p>
            ) : null}
          </section>

          <section className="shop-flight-review-card">
            <h2>السعر المختار</h2>
            {fare ? (
              <>
                <p className="shop-flight-review-fare-name">
                  {fare.labelAr} <span>({fare.label})</span>
                </p>
                <ul className="shop-flight-review-fare-meta">
                  <li>🎒 {fare.cabinBag}</li>
                  <li>🧳 {fare.checkedBag}</li>
                  <li>{fare.refundableLabel}</li>
                </ul>
              </>
            ) : null}
            {provider ? (
              <p className="shop-flight-review-provider">
                المزوّد: <strong>{provider.providerName}</strong>
              </p>
            ) : null}

            <dl className="shop-flight-review-breakdown">
              <div>
                <dt>السعر الأساسي</dt>
                <dd>
                  {formatMoneyMinor(
                    breakdown?.baseMinor ?? draft.flight.sellAmountMinor,
                    draft.flight.currency,
                  )}
                </dd>
              </div>
              <div>
                <dt>الضرائب والرسوم</dt>
                <dd>
                  {formatMoneyMinor(breakdown?.taxesMinor ?? 0, draft.flight.currency)}
                </dd>
              </div>
              <div>
                <dt>رسوم الخدمة</dt>
                <dd>
                  {formatMoneyMinor(breakdown?.serviceFeeMinor ?? 0, draft.flight.currency)}
                </dd>
              </div>
              <div className="total">
                <dt>الإجمالي</dt>
                <dd>{formatMoneyMinor(totalMinor, draft.flight.currency)}</dd>
              </div>
            </dl>

            <p className="shop-flight-review-pax">
              {draft.adults} بالغ
              {draft.children ? ` · ${draft.children} طفل` : ""}
              {draft.infants ? ` · ${draft.infants} رضيع` : ""}
            </p>
          </section>
        </div>

        <footer className="shop-flight-review-foot">
          <button type="button" className="shop-flight-review-back" onClick={backToResults}>
            العودة إلى النتائج
          </button>
          <button type="button" className="shop-flight-review-continue" onClick={continueToTravelers}>
            متابعة لإدخال بيانات المسافرين
          </button>
          <button
            type="button"
            className="shop-flight-review-cancel"
            onClick={() => {
              clearBookingDraft();
              router.push("/");
            }}
          >
            إلغاء
          </button>
        </footer>
      </div>
    </StoreFront>
  );
}
