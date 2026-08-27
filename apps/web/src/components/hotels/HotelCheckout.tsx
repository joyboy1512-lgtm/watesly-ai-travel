"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import { formatHotelDay, rateDisplayMinor } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import type { HotelBookingDraft } from "@/lib/booking-draft";

type Traveler = {
  title: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  gender: string;
};

type Props = {
  draft: HotelBookingDraft;
  travelers: Traveler[];
  setTravelers: Dispatch<SetStateAction<Traveler[]>>;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  specialRequests: string;
  setSpecialRequests: (v: string) => void;
  paymentMethod: string | null;
  setPaymentMethod: (v: string | null) => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
};

const PAYMENT_OPTIONS = [
  { id: "knet", label: "كي نت", hint: "KNET" },
  { id: "visa", label: "فيزا / ماستركارد", hint: "Visa" },
  { id: "deema", label: "ديما", hint: "Deema" },
  { id: "linktap", label: "لينك تاب", hint: "LinkTap" },
] as const;

export function HotelCheckout({
  draft,
  travelers,
  setTravelers,
  email,
  setEmail,
  phone,
  setPhone,
  name,
  setName,
  specialRequests,
  setSpecialRequests,
  paymentMethod,
  setPaymentMethod,
  error,
  submitting,
  onSubmit,
}: Props) {
  const rate = draft.selectedRate;
  const nights = draft.nights || 1;
  const guests = draft.adults + draft.children;
  const hotelName = String(draft.hotel.details.name || draft.hotel.description || "فندق");
  const totalMinor =
    draft.totalMinor ??
    (rate ? rateDisplayMinor(rate, draft.hotel, nights) : draft.hotel.sellAmountMinor);
  const dateLabel = [formatHotelDay(draft.checkIn), formatHotelDay(draft.checkOut)]
    .filter(Boolean)
    .join(" – ");

  return (
    <div className="shop-flight-checkout shop-hotel-checkout">
      <ShopMockBanner compact />
      <div className="shop-flight-checkout-steps" aria-label="خطوات الحجز">
        {["مراجعة الإقامة", "بيانات الضيوف", "الدفع"].map((label, idx) => (
          <span
            key={label}
            className={`shop-flight-checkout-step${idx === 1 ? " on" : idx === 0 ? " done" : ""}`}
          >
            <i>{idx + 1}</i>
            {label}
          </span>
        ))}
      </div>

      <div className="shop-flight-checkout-summary">
        <p>
          {nights} {nights === 1 ? "ليلة" : "ليالي"} · {guests}{" "}
          {guests === 1 ? "ضيف" : "ضيوف"} · {dateLabel}
        </p>
        <h1>{hotelName}</h1>
        {rate ? (
          <p className="shop-hotel-checkout-room">
            {rate.roomName} · {rate.boardName}
          </p>
        ) : null}
      </div>

      {error ? <p className="shop-error">{error}</p> : null}

      <div className="shop-flight-checkout-layout">
        <div className="shop-flight-checkout-main">
          <section className="shop-flight-checkout-card">
            <h2>بيانات الضيوف</h2>
            {travelers.map((traveler, idx) => (
              <div key={idx} className="shop-form-row">
                <label>
                  {idx === 0 ? "الضيف الرئيسي" : `ضيف ${idx + 1}`} — الاسم
                  <input
                    value={traveler.firstName}
                    placeholder="الاسم الأول"
                    onChange={(e) =>
                      setTravelers((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, firstName: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  العائلة
                  <input
                    value={traveler.lastName}
                    onChange={(e) =>
                      setTravelers((rows) =>
                        rows.map((row, i) =>
                          i === idx ? { ...row, lastName: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
              </div>
            ))}
          </section>

          <section className="shop-flight-checkout-card">
            <h2>بيانات التواصل</h2>
            <div className="shop-flight-contact-grid">
              <label>
                الاسم للتواصل
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                البريد الإلكتروني
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                رقم الجوال
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+965" />
              </label>
            </div>
            <label>
              طلبات خاصة للفندق
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="وصول متأخر، غرفة هادئة..."
                rows={3}
              />
            </label>
          </section>

          <section className="shop-flight-checkout-card">
            <h2>طريقة الدفع</h2>
            <div className="shop-payment-grid">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`shop-payment-option${paymentMethod === opt.id ? " on" : ""}`}
                  onClick={() => setPaymentMethod(opt.id)}
                >
                  <strong>{opt.label}</strong>
                  <small>{opt.hint}</small>
                </button>
              ))}
            </div>
            <p className="shop-hint">مرحلة اختبار — لن يُخصم مبلغ فعلي</p>
          </section>

          <div className="shop-flight-checkout-nav">
            <Link href={draft.resultsReturnHref || "/hotels/results"}>‹ رجوع</Link>
            <button type="button" disabled={submitting || !paymentMethod} onClick={onSubmit}>
              {submitting ? "جارٍ الحفظ..." : "إتمام الحجز"}
            </button>
          </div>
        </div>

        <aside className="shop-flight-price-card">
          <h3>تفاصيل السعر</h3>
          <div className="shop-flight-price-line">
            <span>
              {nights} {nights === 1 ? "ليلة" : "ليالي"} · {draft.rooms}{" "}
              {draft.rooms === 1 ? "غرفة" : "غرف"}
            </span>
            <span>{formatMoneyMinor(totalMinor, draft.hotel.currency)}</span>
          </div>
          {rate ? (
            <div className="shop-flight-price-line">
              <span>{rate.roomName}</span>
              <span>{rate.boardName}</span>
            </div>
          ) : null}
          <div className="shop-flight-price-total">
            <span>الإجمالي</span>
            <strong>{formatMoneyMinor(totalMinor, draft.hotel.currency)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
