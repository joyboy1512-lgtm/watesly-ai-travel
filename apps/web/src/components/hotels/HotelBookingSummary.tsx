"use client";

import {
  formatPolicyDate,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
  type HotelRoomOption,
} from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";

type StayMeta = {
  stayQuery: string;
  departDate: string;
  returnDate: string;
  rooms: number;
  adults: number;
  children: number;
};

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  rate: HotelRateOption;
  nights: number;
  meta: StayMeta;
  onBack: () => void;
  onEnterGuestData: () => void;
};

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "الدفع في الفندق";
  if (type === "AT_WEB") return "الدفع أونلاين";
  return type || "—";
}

function formatDay(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function HotelBookingSummary({
  hotel,
  rate,
  nights,
  meta,
  onBack,
  onEnterGuestData,
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
    <div className="hotel-booking-summary">
      <button type="button" className="hotel-summary-back" onClick={onBack}>
        ← العودة لاختيار الغرفة
      </button>

      <h3>تفاصيل الحجز</h3>
      <p className="hotel-summary-sub">{name}</p>

      {roomImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={roomImage} alt="" className="hotel-booking-preview-room-img" />
      ) : null}

      <div className="hotel-booking-preview-grid">
        <div>
          <span>تسجيل الوصول</span>
          <strong>{formatDay(meta.departDate)}</strong>
        </div>
        <div>
          <span>تسجيل المغادرة</span>
          <strong>{formatDay(meta.returnDate)}</strong>
        </div>
        <div>
          <span>المدة</span>
          <strong>
            {nights} {nights === 1 ? "ليلة" : "ليالي"}
          </strong>
        </div>
        <div>
          <span>النزلاء</span>
          <strong>
            {meta.rooms} غرفة · {meta.adults} بالغ
            {meta.children ? ` · ${meta.children} طفل` : ""}
          </strong>
        </div>
        <div>
          <span>نوع الغرفة</span>
          <strong>{rate.roomName}</strong>
        </div>
        <div>
          <span>الوجبات</span>
          <strong>{rate.boardName}</strong>
        </div>
        <div>
          <span>طريقة الدفع</span>
          <strong>{paymentLabel(rate.paymentType)}</strong>
        </div>
        <div>
          <span>سياسة الإلغاء</span>
          <strong>
            {rate.freeCancellation ? "إلغاء مجاني*" : "غير قابل للاسترداد"}
          </strong>
          {cancelPolicy?.from ? (
            <small>حتى {formatPolicyDate(cancelPolicy.from)}</small>
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

      <footer className="hotel-summary-foot">
        <div className="hotel-booking-preview-price">
          <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
          <small>
            {formatMoneyMinor(perNight, hotel.currency)} / ليلة · {nights}{" "}
            {nights === 1 ? "ليلة" : "ليالي"} · شامل الضرائب
          </small>
        </div>
        <button type="button" className="btn" onClick={onEnterGuestData}>
          إدخال البيانات
        </button>
      </footer>
    </div>
  );
}
