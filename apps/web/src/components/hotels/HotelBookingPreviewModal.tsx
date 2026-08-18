"use client";

import {
  formatPolicyDate,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
  type HotelRoomOption,
} from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  rate: HotelRateOption;
  nights: number;
  onClose: () => void;
  onConfirm: () => void;
};

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "الدفع في الفندق";
  if (type === "AT_WEB") return "الدفع أونلاين";
  return type || "—";
}

export function HotelBookingPreviewModal({
  hotel,
  rate,
  nights,
  onClose,
  onConfirm,
}: Props) {
  const name = String(hotel.details.name || "فندق");
  const totalMinor = rateDisplayMinor(rate, hotel, nights);
  const perNight = nights > 0 ? Math.round(totalMinor / nights) : totalMinor;
  const rooms = Array.isArray(hotel.details.rooms)
    ? (hotel.details.rooms as HotelRoomOption[])
    : [];
  const roomMeta = rooms.find((r) => r.code === rate.roomCode);
  const roomFacilities = roomMeta?.facilities || [];
  const hotelFacilities = Array.isArray(hotel.details.facilityLabels)
    ? (hotel.details.facilityLabels as string[])
    : [];
  const roomImage = roomMeta?.imageUrl;
  const cancelPolicy = rate.cancellationPolicies[0];

  return (
    <div className="flight-modal-backdrop hotel-preview-backdrop" onClick={onClose} role="presentation">
      <div
        className="flight-modal hotel-booking-preview"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flight-modal-head">
          <div>
            <h2>ملخص الحجز</h2>
            <p>{name}</p>
          </div>
          <button type="button" className="flight-modal-close" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </header>

        <section className="hotel-booking-preview-body">
          {roomImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={roomImage} alt="" className="hotel-booking-preview-room-img" />
          ) : null}

          <div className="hotel-booking-preview-grid">
            <div>
              <span>نوع الغرفة</span>
              <strong>{rate.roomName}</strong>
            </div>
            <div>
              <span>الوجبات</span>
              <strong>{rate.boardName}</strong>
            </div>
            <div>
              <span>المدة</span>
              <strong>
                {nights} {nights === 1 ? "ليلة" : "ليالي"}
              </strong>
            </div>
            <div>
              <span>طريقة الدفع</span>
              <strong>{paymentLabel(rate.paymentType)}</strong>
            </div>
            <div>
              <span>الإلغاء</span>
              <strong>
                {rate.freeCancellation ? "إلغاء مجاني*" : "غير قابل للاسترداد"}
              </strong>
              {cancelPolicy?.from ? (
                <small>deadline: {formatPolicyDate(cancelPolicy.from)}</small>
              ) : null}
            </div>
            {rate.allotment != null ? (
              <div>
                <span>الغرف المتبقية</span>
                <strong>{rate.allotment}</strong>
              </div>
            ) : null}
          </div>

          {roomFacilities.length ? (
            <div className="hotel-booking-preview-services">
              <h3>خدمات الغرفة</h3>
              <ul>
                {roomFacilities.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {hotelFacilities.length ? (
            <div className="hotel-booking-preview-services">
              <h3>مرافق الفندق</h3>
              <ul>
                {hotelFacilities.slice(0, 8).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {rate.promotions?.length ? (
            <div className="hotel-booking-preview-promo">
              {rate.promotions.map((p, i) => (
                <p key={i}>{p.name || p.remark}</p>
              ))}
            </div>
          ) : null}
        </section>

        <footer className="flight-modal-foot">
          <div className="hotel-booking-preview-price">
            <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
            <small>
              {formatMoneyMinor(perNight, hotel.currency)} / ليلة · شامل الضرائب
            </small>
          </div>
          <button type="button" className="btn" onClick={onConfirm}>
            متابعة لإدخال بيانات النزلاء
          </button>
        </footer>
      </div>
    </div>
  );
}
