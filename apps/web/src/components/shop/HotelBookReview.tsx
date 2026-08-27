"use client";

import { useRouter } from "next/navigation";
import {
  clearBookingDraft,
  saveHotelDraft,
  type HotelBookingDraft,
} from "@/lib/booking-draft";
import { formatHotelDay, formatPolicyDate } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";

type Props = {
  booking: HotelBookingDraft;
};

export function HotelBookReview({ booking }: Props) {
  const router = useRouter();
  const rate = booking.selectedRate;
  const nights = booking.nights || 1;
  const guests = booking.adults + booking.children;
  const hotelName = String(booking.hotel.details.name || booking.hotel.description || "فندق");
  const stars = Number(booking.hotel.details.stars || 0);
  const totalMinor = booking.totalMinor ?? booking.hotel.sellAmountMinor;
  const perNight = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;

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
            {nights} {nights === 1 ? "ليلة" : "ليالي"}
            {" · "}
            {guests} {guests === 1 ? "ضيف" : "ضيوف"}
            {" · "}
            {booking.rooms} {booking.rooms === 1 ? "غرفة" : "غرف"}
          </p>
          <p className="shop-hotel-review-location">
            {booking.locationLabel || booking.location}
          </p>

          {rate ? (
            <article className="shop-hotel-review-room">
              <h3>الغرفة المختارة</h3>
              <p>
                <strong>{rate.roomName}</strong> · {rate.boardName}
              </p>
              <small>
                {rate.freeCancellation ? "إلغاء مجاني*" : "غير قابل للاسترداد"}
              </small>
            </article>
          ) : null}

          {booking.priceChanged && booking.previousTotalMinor ? (
            <p className="shop-hotel-review-price-change">
              تغيّر السعر بعد التحقق: من{" "}
              {formatMoneyMinor(booking.previousTotalMinor, booking.hotel.currency)} إلى{" "}
              {formatMoneyMinor(totalMinor, booking.hotel.currency)}
            </p>
          ) : null}
        </section>

        <section className="shop-flight-review-card">
          <h2>السعر المختار</h2>
          {rate ? (
            <p className="shop-flight-review-fare-name">
              {rate.roomName} · {rate.boardName}
            </p>
          ) : null}

          <dl className="shop-flight-review-breakdown">
            <div>
              <dt>سعر الإقامة</dt>
              <dd>{formatMoneyMinor(totalMinor, booking.hotel.currency)}</dd>
            </div>
            <div>
              <dt>متوسط الليلة</dt>
              <dd>{formatMoneyMinor(perNight, booking.hotel.currency)}</dd>
            </div>
            <div className="total">
              <dt>الإجمالي</dt>
              <dd>{formatMoneyMinor(totalMinor, booking.hotel.currency)}</dd>
            </div>
          </dl>

          <p className="shop-flight-review-pax">
            {booking.adults} بالغ
            {booking.children ? ` · ${booking.children} طفل` : ""}
            {booking.infants ? ` · ${booking.infants} رضيع` : ""}
          </p>
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
