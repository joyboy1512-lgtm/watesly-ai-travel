"use client";

import { useState } from "react";
import {
  formatHotelDay,
  formatPolicyDate,
  rateDisplayMinor,
  taxTypeLabelAr,
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
  infants?: number;
};

type PriceChange = {
  fromMinor: number;
  toMinor: number;
};

type CheckoutPayload = {
  rate: HotelRateOption;
  contact: { name: string; email: string; phone: string };
  specialRequests: string;
  paymentMethod: string;
  travelers: Array<{ firstName: string; lastName: string }>;
};

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  rate: HotelRateOption;
  nights: number;
  meta: StayMeta;
  priceChange?: PriceChange | null;
  shopStyle?: boolean;
  onBack: () => void;
  onEnterGuestData: () => void;
  onCheckout?: (payload: CheckoutPayload) => void;
  onContinueToReview?: () => void;
};

const PAYMENT_OPTIONS = [
  { id: "knet", label: "كي نت", hint: "KNET" },
  { id: "visa", label: "فيزا / ماستركارد", hint: "Visa" },
  { id: "deema", label: "ديما", hint: "Deema" },
  { id: "linktap", label: "لينك تاب", hint: "LinkTap" },
] as const;

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "الدفع في الفندق";
  if (type === "AT_WEB") return "الدفع أونلاين";
  return type || "—";
}

function formatDay(value?: string) {
  return formatHotelDay(value) || "—";
}

function InfoColumns({ sections }: { sections: Array<{ title: string; items: string[] }> }) {
  const tiles = sections.filter((s) => s.items.length);
  if (!tiles.length) return null;
  const rows: Array<typeof tiles> = [];
  for (let i = 0; i < tiles.length; i += 3) rows.push(tiles.slice(i, i + 3));
  return (
    <div className="hotel-info-columns">
      {rows.map((row, ri) => (
        <div key={ri} className="hotel-info-columns-row">
          {row.map((col) => (
            <div key={col.title} className="hotel-info-col">
              <h4>{col.title}</h4>
              <ul>
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function HotelBookingSummary({
  hotel,
  rate,
  nights,
  meta,
  priceChange,
  shopStyle,
  onBack,
  onEnterGuestData,
  onCheckout,
  onContinueToReview,
}: Props) {
  const [step, setStep] = useState<"summary" | "guest" | "payment">("summary");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [travelerFirst, setTravelerFirst] = useState("");
  const [travelerLast, setTravelerLast] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const hotelName = String(hotel.details.name || "فندق");
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
  const taxItems = rate.taxes?.items || [];

  const infoSections = [
    { title: "خدمات الغرفة", items: roomFacilities },
    { title: "مرافق الفندق", items: hotelFacilities.slice(0, 9) },
    ...(rate.rateComments ? [{ title: "شروط التعرفة", items: [rate.rateComments] }] : []),
    ...(rate.promotions?.length
      ? [{ title: "عروض", items: rate.promotions.map((p) => p.name || p.remark || "").filter(Boolean) }]
      : []),
  ];

  function submitGuest() {
    if (!name.trim() || !phone.trim()) return;
    if (onContinueToReview) {
      onContinueToReview();
      return;
    }
    if (shopStyle && onCheckout) {
      setStep("payment");
      return;
    }
    onEnterGuestData();
  }

  function submitPayment() {
    if (!paymentMethod) return;
    if (onCheckout) {
      onCheckout({
        rate,
        contact: { name, email, phone },
        specialRequests,
        paymentMethod,
        travelers: [{ firstName: travelerFirst || name.split(" ")[0] || "", lastName: travelerLast || name.split(" ").slice(1).join(" ") || "" }],
      });
      return;
    }
    onEnterGuestData();
  }

  if (step === "payment" && shopStyle) {
    return (
      <div className={`hotel-booking-summary${shopStyle ? " hotel-booking-summary-shop" : ""}`}>
        <button type="button" className="hotel-summary-back" onClick={() => setStep("guest")}>
          ← العودة لبيانات الحجز
        </button>
        <div className="hotel-selected-price-card">
          <div className="hotel-selected-price-main">
            <small>المبلغ الإجمالي</small>
            <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
            <em>
              {formatMoneyMinor(perNight, hotel.currency)} / ليلة · {nights}{" "}
              {nights === 1 ? "ليلة" : "ليالي"}
            </em>
          </div>
          <div className="hotel-selected-price-meta">
            <span>{hotelName}</span>
            <span>
              {rate.roomName} · {rate.boardName}
            </span>
          </div>
        </div>
        <h3>اختر طريقة الدفع</h3>
        <div className="hotel-payment-methods">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`hotel-payment-method${paymentMethod === opt.id ? " on" : ""}`}
              onClick={() => setPaymentMethod(opt.id)}
            >
              <strong>{opt.label}</strong>
              <small>{opt.hint}</small>
            </button>
          ))}
        </div>
        <footer className="hotel-summary-foot hotel-summary-foot-shop">
          <button
            type="button"
            className="btn hotel-checkout-btn"
            disabled={!paymentMethod}
            onClick={submitPayment}
          >
            متابعة الدفع
          </button>
        </footer>
      </div>
    );
  }

  if (step === "guest" && shopStyle) {
    return (
      <div className={`hotel-booking-summary${shopStyle ? " hotel-booking-summary-shop" : ""}`}>
        <button type="button" className="hotel-summary-back" onClick={() => setStep("summary")}>
          ← العودة للتفاصيل
        </button>
        <div className="hotel-guest-card">
          <h3>بيانات الحجز</h3>
          <label>
            الاسم الكامل
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم صاحب الحجز" />
          </label>
          <label>
            الجوال
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+965..." />
          </label>
          <label>
            البريد الإلكتروني
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          </label>
          <div className="hotel-guest-card-row">
            <label>
              اسم المسافر
              <input value={travelerFirst} onChange={(e) => setTravelerFirst(e.target.value)} />
            </label>
            <label>
              العائلة
              <input value={travelerLast} onChange={(e) => setTravelerLast(e.target.value)} />
            </label>
          </div>
          <label>
            طلبات خاصة للفندق
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="مثال: وصول متأخر، غرفة هادئة، سرير إضافي..."
              rows={3}
            />
          </label>
          <button type="button" className="btn hotel-checkout-btn" onClick={submitGuest}>
            متابعة للدفع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`hotel-booking-summary${shopStyle ? " hotel-booking-summary-shop" : ""}`}>
      <button type="button" className="hotel-summary-back" onClick={onBack}>
        ← العودة لاختيار الغرفة
      </button>

      {shopStyle ? (
        <div className="hotel-selected-price-card">
          <div className="hotel-selected-price-main">
            <small>السعر المختار</small>
            <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
            <em>
              {formatMoneyMinor(perNight, hotel.currency)} / ليلة · {nights}{" "}
              {nights === 1 ? "ليلة" : "ليالي"}
            </em>
          </div>
          <div className="hotel-selected-price-meta">
            <span>{hotelName}</span>
            <span>
              {rate.roomName} · {rate.boardName}
            </span>
          </div>
        </div>
      ) : null}

      {!shopStyle ? (
        <>
          <h3>تفاصيل الحجز</h3>
          <p className="hotel-summary-sub">{hotelName}</p>
        </>
      ) : null}

      {priceChange ? (
        <div className="hotel-price-change">
          تغيّر السعر بعد التحقق الحي: من{" "}
          <s>{formatMoneyMinor(priceChange.fromMinor, hotel.currency)}</s> إلى{" "}
          <strong>{formatMoneyMinor(priceChange.toMinor, hotel.currency)}</strong>
        </div>
      ) : null}

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
          <strong>{rate.freeCancellation ? "إلغاء مجاني*" : "غير قابل للاسترداد"}</strong>
          {cancelPolicy?.from ? <small>حتى {formatPolicyDate(cancelPolicy.from)}</small> : null}
        </div>
      </div>

      {taxItems.length ? (
        <div className="hotel-price-break">
          <h3>الضرائب والرسوم</h3>
          <ul>
            {taxItems.map((t, i) => (
              <li key={`${t.type || i}-${t.amount}`}>
                <span>
                  {taxTypeLabelAr(t.type)}
                  {t.included ? " (مشمولة)" : " (غير مشمولة)"}
                </span>
                <strong>
                  {t.amount} {t.currency}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <InfoColumns sections={infoSections} />

      <footer className={`hotel-summary-foot${shopStyle ? " hotel-summary-foot-shop" : ""}`}>
        {!shopStyle ? (
          <div className="hotel-booking-preview-price">
            <strong>{formatMoneyMinor(totalMinor, hotel.currency)}</strong>
            <small>
              {formatMoneyMinor(perNight, hotel.currency)} / ليلة · {nights}{" "}
              {nights === 1 ? "ليلة" : "ليالي"}
            </small>
          </div>
        ) : null}
        <button
          type="button"
          className="btn hotel-checkout-btn"
          onClick={() => {
            if (shopStyle && onContinueToReview) {
              onContinueToReview();
            } else if (shopStyle) {
              setStep("guest");
            } else {
              onEnterGuestData();
            }
          }}
        >
          {shopStyle && onContinueToReview ? "متابعة للمراجعة" : "إدخال البيانات"}
        </button>
      </footer>
    </div>
  );
}
