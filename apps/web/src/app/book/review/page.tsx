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
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { airportPlaceLabel } from "@/lib/airport-cities";
import { airlineName } from "@/lib/flight-airlines";

function FlightBookReview({ booking }: { booking: FlightBookingDraft }) {
  const router = useRouter();
  const { locale } = useShopCopy();
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
        <h1>{locale === "en" ? "Review booking" : "مراجعة الحجز"}</h1>
        <p>
          {locale === "en"
            ? "Check the flight details and price before entering traveler details"
            : "تأكّد من تفاصيل الرحلة والسعر قبل إدخال بيانات المسافرين"}
        </p>
      </header>

      <div className="shop-flight-review-grid">
        <section className="shop-flight-review-card">
          <h2>{locale === "en" ? "Flight summary" : "ملخص الرحلة"}</h2>
          <p className="shop-flight-review-route">
            {locale === "en"
              ? airportPlaceLabel(booking.origin, "en")
              : booking.originLabel || booking.origin}{" "}
            ↔{" "}
            {locale === "en"
              ? airportPlaceLabel(booking.destination, "en")
              : booking.destinationLabel || booking.destination}
          </p>
          <p className="shop-flight-review-dates">
            {formatDay(booking.departDate, locale)}
            {booking.returnDate ? ` – ${formatDay(booking.returnDate, locale)}` : ""}
            {" · "}
            {pax} {locale === "en" ? (pax === 1 ? "traveler" : "travelers") : "مسافر"} ·{" "}
            {cabinLabel(booking.cabinClass, locale)}
          </p>

          {outbound ? (
            <article className="shop-flight-review-leg">
              <h3>{locale === "en" ? "Outbound flight" : "رحلة الذهاب"}</h3>
              <div className="shop-flight-review-leg-row">
                {airlineLogo(outbound.airlineCode) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={airlineLogo(outbound.airlineCode)!} alt="" />
                ) : null}
                <div>
                  <strong>
                    {airlineName(outbound.airlineCode, outbound.airlineName, locale)}
                  </strong>
                  <p>
                    {formatClock(outbound.departAt)} {outbound.from} → {outbound.to}{" "}
                    {formatClock(outbound.arriveAt)}
                  </p>
                  <small>
                    {stopsLabel(outbound.stops, locale)} ·{" "}
                    {locale === "en"
                      ? outbound.durationLabel
                          .replace(/(\d+)\s*س/g, "$1h")
                          .replace(/(\d+)\s*د/g, "$1m")
                      : outbound.durationLabel}
                    {outbound.flightNumbers ? ` · ${outbound.flightNumbers}` : ""}
                  </small>
                </div>
              </div>
            </article>
          ) : null}

          {returnLeg ? (
            <article className="shop-flight-review-leg">
              <h3>{locale === "en" ? "Return flight" : "رحلة العودة"}</h3>
              <div className="shop-flight-review-leg-row">
                {airlineLogo(returnLeg.airlineCode) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={airlineLogo(returnLeg.airlineCode)!} alt="" />
                ) : null}
                <div>
                  <strong>
                    {airlineName(returnLeg.airlineCode, returnLeg.airlineName, locale)}
                  </strong>
                  <p>
                    {formatClock(returnLeg.departAt)} {returnLeg.from} → {returnLeg.to}{" "}
                    {formatClock(returnLeg.arriveAt)}
                  </p>
                  <small>
                    {stopsLabel(returnLeg.stops, locale)} ·{" "}
                    {locale === "en"
                      ? returnLeg.durationLabel
                          .replace(/(\d+)\s*س/g, "$1h")
                          .replace(/(\d+)\s*د/g, "$1m")
                      : returnLeg.durationLabel}
                    {returnLeg.flightNumbers ? ` · ${returnLeg.flightNumbers}` : ""}
                  </small>
                </div>
              </div>
            </article>
          ) : null}

          {trip?.isMixMatch ? (
            <p className="shop-flight-review-mix-tag">
              {locale === "en"
                ? "Custom combination (outbound and return from different offers)"
                : "تركيبة مخصصة (ذهاب + عودة من عروض مختلفة)"}
            </p>
          ) : null}
        </section>

        <section className="shop-flight-review-card">
          <h2>{locale === "en" ? "Price" : "السعر"}</h2>
          <dl className="shop-flight-review-breakdown">
            <div className="total">
              <dt>{locale === "en" ? "Total" : "الإجمالي"}</dt>
              <dd>{formatMoneyMinor(totalMinor, booking.flight.currency)}</dd>
            </div>
          </dl>
          <p className="shop-hint" style={{ margin: 0 }}>
            {locale === "en" ? "Includes taxes and fees" : "يشمل الضرائب والرسوم"}
            {typeof booking.flight.details.selectedFareBrand === "string"
              ? ` · ${booking.flight.details.selectedFareBrand}`
              : ""}
          </p>

          <p className="shop-flight-review-pax">
            {booking.adults} {locale === "en" ? "adult" : "بالغ"}
            {booking.children
              ? ` · ${booking.children} ${locale === "en" ? "child" : "طفل"}`
              : ""}
            {booking.infants
              ? ` · ${booking.infants} ${locale === "en" ? "infant" : "رضيع"}`
              : ""}
          </p>
        </section>
      </div>

      <footer className="shop-flight-review-foot">
        <button type="button" className="shop-flight-review-back" onClick={backToResults}>
          {locale === "en" ? "Back to results" : "العودة إلى النتائج"}
        </button>
        <button type="button" className="shop-flight-review-continue" onClick={continueToTravelers}>
          {locale === "en"
            ? "Continue to traveler details"
            : "متابعة لإدخال بيانات المسافرين"}
        </button>
        <button
          type="button"
          className="shop-flight-review-cancel"
          onClick={() => {
            clearBookingDraft();
            router.push("/");
          }}
        >
          {locale === "en" ? "Cancel" : "إلغاء"}
        </button>
      </footer>
    </div>
  );
}

function BookReviewLoading() {
  const { locale } = useShopCopy();
  return (
    <div className="shop-flight-review-loading">
      <div className="shop-flight-spinner" aria-hidden />
      <p>{locale === "en" ? "Loading booking review…" : "جاري تحميل مراجعة الحجز…"}</p>
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
        <BookReviewLoading />
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
