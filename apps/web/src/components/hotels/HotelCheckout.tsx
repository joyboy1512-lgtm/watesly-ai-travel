"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { translateRoomNameAr } from "@watesly-travel/shared";
import { formatHotelDay } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import type { HotelBookingDraft, HotelRoomGuestDraft } from "@/lib/booking-draft";
import {
  arabicAdultCount,
  arabicChildCount,
  arabicNightCount,
  arabicRoomCount,
} from "@/lib/hotel-occupancy";

type FieldErrors = Record<string, string>;

type Props = {
  draft: HotelBookingDraft;
  roomGuests: HotelRoomGuestDraft[];
  setRoomGuests: (next: HotelRoomGuestDraft[]) => void;
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

const TITLES = [
  { id: "mr", label: "السيد" },
  { id: "mrs", label: "السيدة" },
  { id: "ms", label: "الآنسة" },
  { id: "miss", label: "آنسة" },
] as const;

export function validateHotelCheckout(input: {
  name: string;
  phone: string;
  email: string;
  paymentMethod: string | null;
  roomGuests: HotelRoomGuestDraft[];
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = "أدخل اسم صاحب الطلب";
  if (!input.phone.trim() || input.phone.trim().length < 8) {
    errors.phone = "أدخل رقم جوال صحيح";
  }
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "البريد غير صحيح";
  }
  if (!input.paymentMethod) errors.paymentMethod = "اختر طريقة الدفع";

  const byRoom = new Map<number, HotelRoomGuestDraft[]>();
  for (const g of input.roomGuests) {
    const list = byRoom.get(g.roomIndex) || [];
    list.push(g);
    byRoom.set(g.roomIndex, list);
  }
  for (const [roomIndex, guests] of byRoom) {
    if (!guests.some((g) => g.isLead)) {
      errors[`room-${roomIndex}-lead`] = "حدد النزيل الرئيسي لهذه الغرفة";
    }
    guests.forEach((g, idx) => {
      const key = `guest-${roomIndex}-${idx}`;
      if (!g.firstName.trim()) errors[`${key}-first`] = "الاسم الأول مطلوب";
      if (!g.lastName.trim()) errors[`${key}-last`] = "اسم العائلة مطلوب";
      if (g.type === "child" && (g.age == null || g.age < 0 || g.age > 17)) {
        errors[`${key}-age`] = "أدخل عمر الطفل";
      }
    });
  }
  return errors;
}

export function HotelCheckout({
  draft,
  roomGuests,
  setRoomGuests,
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const rate = draft.selectedRate;
  const nights = draft.nights || 1;
  const hotelName = String(draft.hotel.details.name || draft.hotel.description || "فندق");
  const bd = draft.priceBreakdown;
  const currency = draft.hotel.currency;
  const payNow = bd?.payNowMinor ?? draft.totalMinor ?? draft.hotel.sellAmountMinor;
  const payAtHotel = bd?.payAtHotelMinor ?? 0;
  const tripTotal = bd?.tripTotalMinor ?? payNow + payAtHotel;
  const roomLabel = rate ? translateRoomNameAr(rate.roomName).ar : "غرفة";
  const dateLabel = [formatHotelDay(draft.checkIn), formatHotelDay(draft.checkOut)]
    .filter(Boolean)
    .join(" – ");

  const roomsGrouped = useMemo(() => {
    const map = new Map<number, HotelRoomGuestDraft[]>();
    for (const g of roomGuests) {
      const list = map.get(g.roomIndex) || [];
      list.push(g);
      map.set(g.roomIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [roomGuests]);

  function updateGuest(
    roomIndex: number,
    guestIndexInRoom: number,
    patch: Partial<HotelRoomGuestDraft>,
  ) {
    const next = roomGuests.map((g) => ({ ...g }));
    const roomGuestsList = next.filter((g) => g.roomIndex === roomIndex);
    const target = roomGuestsList[guestIndexInRoom];
    if (!target) return;
    Object.assign(target, patch);
    if (patch.isLead) {
      for (const g of next) {
        if (g.roomIndex === roomIndex) g.isLead = g === target;
      }
    }
    setRoomGuests(next);
  }

  function handleSubmit() {
    const errors = validateHotelCheckout({
      name,
      phone,
      email,
      paymentMethod,
      roomGuests,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    onSubmit();
  }

  return (
    <div className="shop-flight-checkout shop-hotel-checkout">
      <ShopMockBanner compact kind="hotel" />
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
        <h1>{hotelName}</h1>
        <p className="shop-hotel-checkout-room">
          {roomLabel}
          {rate?.roomName && rate.roomName !== roomLabel ? (
            <small> ({rate.roomName})</small>
          ) : null}{" "}
          · {arabicRoomCount(draft.rooms)}
        </p>
        <p>
          {arabicNightCount(nights)} · {arabicAdultCount(draft.adults)}
          {draft.children ? ` · ${arabicChildCount(draft.children)}` : ""}
          {dateLabel ? ` · ${dateLabel}` : ""}
        </p>
        <p className="shop-hotel-checkout-pay-split">
          {formatMoneyMinor(payNow, currency)}
          {payAtHotel > 0
            ? ` + ${formatMoneyMinor(payAtHotel, currency)} تُدفع في الفندق`
            : ""}
        </p>
      </div>

      {error ? <p className="shop-error">{error}</p> : null}

      <div className="shop-flight-checkout-layout">
        <div className="shop-flight-checkout-main">
          <section className="shop-flight-checkout-card">
            <h2>بيانات صاحب الطلب</h2>
            <div className="shop-flight-contact-grid">
              <label>
                الاسم
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name ? <em className="shop-field-error">{fieldErrors.name}</em> : null}
              </label>
              <label>
                رقم الجوال
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+965"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone ? <em className="shop-field-error">{fieldErrors.phone}</em> : null}
              </label>
              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? <em className="shop-field-error">{fieldErrors.email}</em> : null}
              </label>
            </div>
          </section>

          {roomsGrouped.map(([roomIndex, guests]) => (
            <section key={roomIndex} className="shop-flight-checkout-card">
              <h2>نزلاء الغرفة {roomIndex + 1}</h2>
              {fieldErrors[`room-${roomIndex}-lead`] ? (
                <p className="shop-field-error">{fieldErrors[`room-${roomIndex}-lead`]}</p>
              ) : null}
              {guests.map((guest, idx) => {
                const key = `guest-${roomIndex}-${idx}`;
                return (
                  <div key={key} className="shop-hotel-guest-block">
                    <div className="shop-form-row shop-hotel-guest-row">
                      <label>
                        اللقب
                        <select
                          value={guest.title}
                          onChange={(e) => updateGuest(roomIndex, idx, { title: e.target.value })}
                        >
                          {TITLES.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        الاسم الأول
                        <input
                          value={guest.firstName}
                          onChange={(e) =>
                            updateGuest(roomIndex, idx, { firstName: e.target.value })
                          }
                          aria-invalid={Boolean(fieldErrors[`${key}-first`])}
                        />
                        {fieldErrors[`${key}-first`] ? (
                          <em className="shop-field-error">{fieldErrors[`${key}-first`]}</em>
                        ) : null}
                      </label>
                      <label>
                        اسم العائلة
                        <input
                          value={guest.lastName}
                          onChange={(e) =>
                            updateGuest(roomIndex, idx, { lastName: e.target.value })
                          }
                          aria-invalid={Boolean(fieldErrors[`${key}-last`])}
                        />
                        {fieldErrors[`${key}-last`] ? (
                          <em className="shop-field-error">{fieldErrors[`${key}-last`]}</em>
                        ) : null}
                      </label>
                    </div>
                    <div className="shop-form-row shop-hotel-guest-meta">
                      <label>
                        النوع
                        <select
                          value={guest.type}
                          onChange={(e) =>
                            updateGuest(roomIndex, idx, {
                              type: e.target.value as "adult" | "child",
                            })
                          }
                        >
                          <option value="adult">بالغ</option>
                          <option value="child">طفل</option>
                        </select>
                      </label>
                      {guest.type === "child" ? (
                        <label>
                          العمر
                          <select
                            value={guest.age ?? 8}
                            onChange={(e) =>
                              updateGuest(roomIndex, idx, { age: Number(e.target.value) })
                            }
                          >
                            {Array.from({ length: 18 }, (_, age) => (
                              <option key={age} value={age}>
                                {age} سنة
                              </option>
                            ))}
                          </select>
                          {fieldErrors[`${key}-age`] ? (
                            <em className="shop-field-error">{fieldErrors[`${key}-age`]}</em>
                          ) : null}
                        </label>
                      ) : null}
                      <label className="shop-hotel-lead-check">
                        <input
                          type="radio"
                          name={`lead-${roomIndex}`}
                          checked={guest.isLead}
                          onChange={() => updateGuest(roomIndex, idx, { isLead: true })}
                        />
                        النزيل الرئيسي للغرفة
                      </label>
                    </div>
                  </div>
                );
              })}
            </section>
          ))}

          <section className="shop-flight-checkout-card">
            <h2>طلبات خاصة (اختياري)</h2>
            <label>
              ملاحظات للفندق
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
            {fieldErrors.paymentMethod ? (
              <em className="shop-field-error">{fieldErrors.paymentMethod}</em>
            ) : null}
            <p className="shop-hint">مرحلة اختبار — لن يُخصم مبلغ فعلي</p>
          </section>

          <div className="shop-flight-checkout-nav">
            <Link href={"/hotels/book/review"}>‹ رجوع</Link>
            <button type="button" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "جارٍ الحفظ..." : "إتمام الحجز"}
            </button>
          </div>
        </div>

        <aside className="shop-flight-price-card">
          <h3>تفاصيل السعر</h3>
          <div className="shop-flight-price-line">
            <span>سعر الإقامة</span>
            <strong>{formatMoneyMinor(bd?.stayMinor ?? payNow, currency)}</strong>
          </div>
          {(bd?.excludedTaxMinor || 0) > 0 ? (
            <div className="shop-flight-price-line">
              <span>ضرائب غير مشمولة</span>
              <strong>{formatMoneyMinor(bd!.excludedTaxMinor, currency)}</strong>
            </div>
          ) : null}
          {(bd?.serviceFeeMinor || 0) > 0 ? (
            <div className="shop-flight-price-line">
              <span>رسوم WeekendGate</span>
              <strong>{formatMoneyMinor(bd!.serviceFeeMinor, currency)}</strong>
            </div>
          ) : null}
          <div className="shop-flight-price-line">
            <span>تدفع الآن</span>
            <strong>{formatMoneyMinor(payNow, currency)}</strong>
          </div>
          {payAtHotel > 0 ? (
            <div className="shop-flight-price-line">
              <span>تدفع في الفندق</span>
              <strong>{formatMoneyMinor(payAtHotel, currency)}</strong>
            </div>
          ) : null}
          <div className="shop-flight-price-line total">
            <span>التكلفة الكلية</span>
            <strong>{formatMoneyMinor(tripTotal, currency)}</strong>
          </div>
        </aside>
      </div>
    </div>
  );
}
