"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { HotelBookReview } from "@/components/shop/HotelBookReview";
import {
  clearBookingDraft,
  getBookingDraft,
  saveFlightDraft,
  type BookingDraft,
  type FlightBookingDraft,
  type HotelBookingDraft,
} from "@/lib/booking-draft";
import {
  airlineLogo,
  cabinLabel,
  formatClock,
  formatDay,
  stopsLabel,
} from "@/lib/flight-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";

function FlightBookReview({ booking }: { booking: FlightBookingDraft }) {
  const router = useRouter();
  const trip = booking.composedTrip;
  const outbound = booking.selectedOutbound || trip?.outbound;
  const returnLeg = booking.selectedReturn ?? trip?.return ?? null;
  const pax = booking.adults + booking.children;

  const totalMinor = booking.flight.sellAmountMinor;

  function continueToTravelers() {
    const { serviceType: _serviceType, ...payload } = booking;
    saveFlightDraft(payload);
    router.push("/book");
  }

  function backToResults() {
    router.push(booking.resultsReturnHref || "/flights/results");
  }

  return (
    <div className="shop-flight-review-page">
      <ShopMockBanner />
      <header className="shop-flight-review-head">
        <h1>مراجعة الحجز</h1>
        <p>تأكّد من تفاصيل الرحلة والسعر قبل إدخال بيانات المسافرين</p>
      </header>

      <div className="shop-flight-review-grid">
        <section className="shop-flight-review-card">
          <h2>ملخص الرحلة</h2>
          <p className="shop-flight-review-route">
            {booking.originLabel || booking.origin} ↔ {booking.destinationLabel || booking.destination}
          </p>
          <p className="shop-flight-review-dates">
            {formatDay(booking.departDate)}
            {booking.returnDate ? ` – ${formatDay(booking.returnDate)}` : ""}
            {" · "}
            {pax} مسافر · {cabinLabel(booking.cabinClass)}
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
          <h2>السعر</h2>
          <dl className="shop-flight-review-breakdown">
            <div className="total">
              <dt>الإجمالي</dt>
              <dd>{formatMoneyMinor(totalMinor, booking.flight.currency)}</dd>
            </div>
          </dl>
          <p className="shop-hint" style={{ margin: 0 }}>
            يشمل الضرائب والرسوم
          </p>

          <p className="shop-flight-review-pax">
            {booking.adults} بالغ
            {booking.children ? ` · ${booking.children} طفل` : ""}
            {booking.infants ? ` · ${booking.infants} رضيع` : ""}
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
  );
}

export default function BookReviewPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    const loaded = getBookingDraft();
    if (!loaded || (loaded.serviceType !== "flight" && loaded.serviceType !== "hotel")) {
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

  return (
    <StoreFront>
      {draft.serviceType === "hotel" ? (
        <HotelBookReview booking={draft} />
      ) : draft.serviceType === "flight" ? (
        <FlightBookReview booking={draft} />
      ) : null}
    </StoreFront>
  );
}
