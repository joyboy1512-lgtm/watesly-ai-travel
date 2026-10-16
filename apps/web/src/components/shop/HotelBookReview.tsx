"use client";

import { useRouter } from "next/navigation";
import {
  clearBookingDraft,
  saveHotelDraft,
  type HotelBookingDraft,
} from "@/lib/booking-draft";
import { formatHotelDay } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { HotelPricePanel, hotelPriceFromParts } from "@/components/hotels/HotelPricePanel";
import { draftOfferPricing } from "@/lib/hotel-draft-price";
import {
  shopAdultCount,
  shopChildCount,
  shopNightCount,
  shopRoomCount,
} from "@/lib/hotel-occupancy";
import { translateRoomNameAr } from "@watesly-travel/shared";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

type Props = {
  booking: HotelBookingDraft;
};

function formatCancelPolicy(
  rate: NonNullable<HotelBookingDraft["selectedRate"]>,
  locale: "ar" | "en",
) {
  if (rate.freeCancellation) {
    if (rate.cancellationFrom) {
      const d = formatHotelDay(rate.cancellationFrom.slice(0, 10), locale);
      return locale === "en"
        ? `Free cancellation until ${d || rate.cancellationFrom} (Kuwait time)`
        : `إلغاء مجاني حتى ${d || rate.cancellationFrom} (توقيت الكويت)`;
    }
    return locale === "en" ? "Free cancellation*" : "إلغاء مجاني*";
  }
  if (rate.cancellationFrom) {
    const d = formatHotelDay(rate.cancellationFrom.slice(0, 10), locale);
    return locale === "en"
      ? `This booking is non-refundable from ${d || rate.cancellationFrom}`
      : `هذا الحجز غير قابل للاسترداد من تاريخ ${d || rate.cancellationFrom}`;
  }
  return locale === "en" ? "Non-refundable" : "غير قابل للاسترداد";
}

export function HotelBookReview({ booking }: Props) {
  const router = useRouter();
  const { t, locale } = useShopCopy();
  const rates = booking.selectedRates?.length
    ? booking.selectedRates
    : booking.selectedRate
      ? [booking.selectedRate]
      : [];
  const rate = rates[0];
  const nights = booking.nights || 1;
  const hotelName = String(booking.hotel.details.name || booking.hotel.description || t("hotelFallback"));
  const stars = Number(booking.hotel.details.stars || 0);
  const currency = booking.hotel.currency;
  const bd = draftOfferPricing(booking) || booking.priceBreakdown;
  const payNow = bd?.payNowMinor ?? booking.totalMinor ?? booking.hotel.sellAmountMinor;
  const payAtHotel = bd?.payAtHotelMinor ?? 0;
  const translated = rate ? translateRoomNameAr(rate.roomName) : null;
  const roomLabel = translated
    ? locale === "en"
      ? translated.original || rate?.roomName || t("roomWord")
      : translated.ar
    : t("roomWord");
  const boardLabel = (boardCode?: string, boardName?: string) => {
    if (locale === "ar") return boardName || "";
    const labels: Record<string, string> = {
      RO: "Room only",
      BB: "Breakfast included",
      HB: "Half board",
      FB: "Full board",
      AI: "All inclusive",
      SC: "Self catering",
      DB: "Breakfast and dinner",
    };
    return (
      labels[String(boardCode || "").toUpperCase()] ||
      (boardName && !/[\u0600-\u06FF]/.test(boardName) ? boardName : "Room only")
    );
  };
  const adultsLabel = shopAdultCount(locale, booking.adults);
  const childrenLabel = shopChildCount(locale, booking.children);
  const guestsLabel = [adultsLabel, childrenLabel].filter(Boolean).join(" · ");

  function continueToGuests() {
    const { serviceType: _serviceType, ...payload } = booking;
    saveHotelDraft(payload);
    router.push("/hotels/book/guests");
  }

  function backToResults() {
    router.push(booking.resultsReturnHref || "/hotels/results");
  }

  return (
    <div className="shop-flight-review-page shop-hotel-review-page tvlk-hotel">
      <ShopMockBanner kind="hotel" />
      <header className="shop-flight-review-head">
        <h1>{t("reviewStayTitle")}</h1>
        <p>
          {locale === "en"
            ? "Check the stay details and price before entering guest details"
            : "تأكّد من تفاصيل الإقامة والسعر قبل إدخال بيانات الضيوف"}
        </p>
      </header>

      <div className="shop-flight-review-grid">
        <section className="shop-flight-review-card">
          <h2>{locale === "en" ? "Stay summary" : "ملخص الإقامة"}</h2>
          <p className="shop-flight-review-route">{hotelName}</p>
          {stars > 0 ? (
            <p
              className="shop-hotel-review-stars"
              aria-label={`${stars} ${locale === "en" ? "stars" : "نجوم"}`}
            >
              {"★".repeat(Math.min(5, stars))}
            </p>
          ) : null}
          <p className="shop-flight-review-dates">
            {formatHotelDay(booking.checkIn, locale)}
            {" – "}
            {formatHotelDay(booking.checkOut, locale)}
            {" · "}
            {shopNightCount(locale, nights)}
            {" · "}
            {guestsLabel}
            {" · "}
            {shopRoomCount(locale, booking.rooms)}
          </p>
          <p className="shop-hotel-review-location">
            {booking.locationLabel || booking.location}
          </p>

          {rates.length ? (
            <article className="shop-hotel-review-room">
              <h3>
                {rates.length > 1
                  ? t("roomsAndPrices")
                  : locale === "en"
                    ? "Selected room"
                    : "الغرفة المختارة"}
              </h3>
              {rates.map((row, i) => {
                const names = translateRoomNameAr(row.roomName);
                const label = locale === "en" ? names.original || row.roomName : names.ar;
                return (
                  <p key={`${row.rateKey}-${i}`}>
                    <strong>
                      {t("chooseRoomSlot", { n: i + 1 })} · {label}
                    </strong>
                    {" · "}
                    {boardLabel(row.boardCode, row.boardName)}
                    <br />
                    <small>{formatCancelPolicy(row, locale)}</small>
                  </p>
                );
              })}
            </article>
          ) : null}

          {booking.priceChanged && booking.previousTotalMinor ? (
            <p className="shop-hotel-review-price-change">
              {locale === "en" ? "The price changed after verification: from " : "تغيّر السعر بعد التحقق: من "}
              {formatMoneyMinor(booking.previousTotalMinor, currency)}{" "}
              {locale === "en" ? "to" : "إلى"}{" "}
              {formatMoneyMinor(payNow, currency)}
            </p>
          ) : null}
        </section>

        <section className="shop-flight-review-card">
          <h2>{locale === "en" ? "Price details" : "تفاصيل السعر"}</h2>
          {bd ? (
            <HotelPricePanel
              currency={currency}
              nights={nights}
              breakdown={bd}
              roomLabel={roomLabel}
              boardLabel={boardLabel(rate?.boardCode, rate?.boardName)}
              variant="full"
            />
          ) : (
            <HotelPricePanel
              currency={currency}
              nights={nights}
              breakdown={hotelPriceFromParts({
                currency,
                stayMinor: payNow,
                payNowMinor: payNow,
                payAtHotelMinor: payAtHotel,
                nights,
              })}
              roomLabel={roomLabel}
              boardLabel={boardLabel(rate?.boardCode, rate?.boardName)}
            />
          )}
          <p className="shop-flight-review-pax">{guestsLabel}</p>
          <p className="shop-hotel-review-note">
            {locale === "en"
              ? "Sample prices — no real amount is charged at this stage"
              : "الأسعار تجريبية — لا يُخصم مبلغ فعلي في هذه المرحلة"}
          </p>
        </section>
      </div>

      <footer className="shop-flight-review-foot">
        <button type="button" className="shop-flight-review-back" onClick={backToResults}>
          {t("backToHotelResults")}
        </button>
        <button type="button" className="shop-flight-review-continue" onClick={continueToGuests}>
          {t("continueGuestNames")}
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
