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

function formatCancelPolicy(rate: NonNullable<HotelBookingDraft["selectedRate"]>) {
  if (rate.freeCancellation) {
    if (rate.cancellationFrom) {
      const d = formatHotelDay(rate.cancellationFrom.slice(0, 10));
      return `إلغاء مجاني حتى ${d || rate.cancellationFrom} (توقيت الكويت)`;
    }
    return "إلغاء مجاني*";
  }
  if (rate.cancellationFrom) {
    const d = formatHotelDay(rate.cancellationFrom.slice(0, 10));
    return `هذا الحجز غير قابل للاسترداد من تاريخ ${d || rate.cancellationFrom}`;
  }
  return "غير قابل للاسترداد";
}

export function HotelBookReview({ booking }: Props) {
  const router = useRouter();
  const { t, locale } = useShopCopy();
  const rate = booking.selectedRate;
  const nights = booking.nights || 1;
  const hotelName = String(booking.hotel.details.name || booking.hotel.description || t("hotelFallback"));
  const stars = Number(booking.hotel.details.stars || 0);
  const currency = booking.hotel.currency;
  const bd = booking.priceBreakdown;
  const payNow = bd?.payNowMinor ?? booking.totalMinor ?? booking.hotel.sellAmountMinor;
  const payAtHotel = bd?.payAtHotelMinor ?? 0;
  const translated = rate ? translateRoomNameAr(rate.roomName) : null;
  const roomLabel = translated
    ? locale === "en"
      ? translated.original || rate?.roomName || t("roomWord")
      : translated.ar
    : t("roomWord");
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
    <div className="shop-flight-review-page shop-hotel-review-page">
      <ShopMockBanner kind="hotel" />
      <header className="shop-flight-review-head">
        <h1>مراجعة الحجز</h1>
        <p>تأكّد من تفاصيل الإقامة والسعر قبل إدخال بيانات الضيوف</p>
      </header>

      <div className="shop-flight-review-grid">
        <section className="shop-flight-review-card">
          <h2>ملخص الإقامة</h2>
          <p className="shop-flight-review-route">{hotelName}</p>
          {stars > 0 ? (
            <p className="shop-hotel-review-stars" aria-label={`${stars} نجوم`}>
              {"★".repeat(Math.min(5, stars))}
            </p>
          ) : null}
          <p className="shop-flight-review-dates">
            {formatHotelDay(booking.checkIn)}
            {" – "}
            {formatHotelDay(booking.checkOut)}
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

          {rate ? (
            <article className="shop-hotel-review-room">
              <h3>الغرفة المختارة</h3>
              <p>
                <strong>{roomLabel}</strong> · {rate.boardName}
              </p>
              {rate.roomName && rate.roomName !== roomLabel ? (
                <small className="shop-hotel-room-original">{rate.roomName}</small>
              ) : null}
              <small>{formatCancelPolicy(rate)}</small>
            </article>
          ) : null}

          {booking.priceChanged && booking.previousTotalMinor ? (
            <p className="shop-hotel-review-price-change">
              تغيّر السعر بعد التحقق: من{" "}
              {formatMoneyMinor(booking.previousTotalMinor, currency)} إلى{" "}
              {formatMoneyMinor(payNow, currency)}
            </p>
          ) : null}
        </section>

        <section className="shop-flight-review-card">
          <h2>تفاصيل السعر</h2>
          {bd ? (
            <HotelPricePanel
              currency={currency}
              nights={nights}
              breakdown={bd}
              roomLabel={roomLabel}
              boardLabel={rate?.boardName}
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
              boardLabel={rate?.boardName}
            />
          )}
          <p className="shop-flight-review-pax">{guestsLabel}</p>
          <p className="shop-hotel-review-note">الأسعار تجريبية — لا يُخصم مبلغ فعلي في هذه المرحلة</p>
        </section>
      </div>

      <footer className="shop-flight-review-foot">
        <button type="button" className="shop-flight-review-back" onClick={backToResults}>
          العودة إلى النتائج
        </button>
        <button type="button" className="shop-flight-review-continue" onClick={continueToGuests}>
          متابعة لإدخال بيانات الضيوف
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
