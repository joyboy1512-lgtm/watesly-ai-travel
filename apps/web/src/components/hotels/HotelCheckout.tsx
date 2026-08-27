"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { translateRoomNameAr } from "@watesly-travel/shared";
import { formatHotelDay } from "@/lib/hotel-search";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { HotelPricePanel, hotelPriceFromParts } from "@/components/hotels/HotelPricePanel";
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
  phoneCountry: string;
  setPhoneCountry: (v: string) => void;
  emailConfirm: string;
  setEmailConfirm: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  specialRequests: string;
  setSpecialRequests: (v: string) => void;
  paymentMethod: string | null;
  setPaymentMethod: (v: string | null) => void;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
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

const COUNTRY_CODES = [
  { id: "+965", label: "🇰🇼 +965" },
  { id: "+966", label: "🇸🇦 +966" },
  { id: "+971", label: "🇦🇪 +971" },
  { id: "+973", label: "🇧🇭 +973" },
  { id: "+974", label: "🇶🇦 +974" },
  { id: "+968", label: "🇴🇲 +968" },
  { id: "+20", label: "🇪🇬 +20" },
  { id: "+1", label: "🇺🇸 +1" },
] as const;

const LATIN_NAME = /^[A-Za-z][A-Za-z\s'.-]{1,59}$/;

export function validateHotelCheckout(input: {
  name: string;
  phone: string;
  phoneCountry: string;
  email: string;
  emailConfirm: string;
  paymentMethod: string | null;
  termsAccepted: boolean;
  roomGuests: HotelRoomGuestDraft[];
}): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.name.trim()) errors.name = "أدخل اسم صاحب الطلب";
  const phoneDigits = input.phone.replace(/\D/g, "");
  if (phoneDigits.length < 8) errors.phone = "أدخل رقم جوال صحيح";
  if (!input.phoneCountry) errors.phoneCountry = "اختر مفتاح الدولة";
  if (!input.email.trim()) errors.email = "البريد مطلوب";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "البريد غير صحيح";
  }
  if (input.emailConfirm.trim().toLowerCase() !== input.email.trim().toLowerCase()) {
    errors.emailConfirm = "تأكيد البريد غير مطابق";
  }
  if (!input.paymentMethod) errors.paymentMethod = "اختر طريقة الدفع";
  if (!input.termsAccepted) {
    errors.terms = "يجب الموافقة على الشروط وسياسة الإلغاء";
  }

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
      if (!g.firstNameEn?.trim() || !LATIN_NAME.test(g.firstNameEn.trim())) {
        errors[`${key}-firstEn`] = "اكتب الاسم الأول بالإنجليزية كما في الجواز";
      }
      if (!g.lastNameEn?.trim() || !LATIN_NAME.test(g.lastNameEn.trim())) {
        errors[`${key}-lastEn`] = "اكتب اسم العائلة بالإنجليزية كما في الجواز";
      }
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
  phoneCountry,
  setPhoneCountry,
  emailConfirm,
  setEmailConfirm,
  name,
  setName,
  specialRequests,
  setSpecialRequests,
  paymentMethod,
  setPaymentMethod,
  termsAccepted,
  setTermsAccepted,
  error,
  submitting,
  onSubmit,
}: Props) {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLDivElement>(null);
  const rate = draft.selectedRate;
  const nights = draft.nights || 1;
  const hotelName = String(draft.hotel.details.name || draft.hotel.description || "فندق");
  const bd = draft.priceBreakdown;
  const currency = draft.hotel.currency;
  const payNow = bd?.payNowMinor ?? draft.totalMinor ?? draft.hotel.sellAmountMinor;
  const payAtHotel = bd?.payAtHotelMinor ?? 0;
  const roomLabel = rate ? translateRoomNameAr(rate.roomName).ar : "غرفة";
  const dateLabel = [formatHotelDay(draft.checkIn), formatHotelDay(draft.checkOut)]
    .filter(Boolean)
    .join(" – ");

  const breakdown = bd
    ? bd
    : hotelPriceFromParts({
        currency,
        stayMinor: payNow,
        payNowMinor: payNow,
        payAtHotelMinor: payAtHotel,
        nights,
      });

  const roomsGrouped = useMemo(() => {
    const map = new Map<number, HotelRoomGuestDraft[]>();
    for (const g of roomGuests) {
      const list = map.get(g.roomIndex) || [];
      list.push(g);
      map.set(g.roomIndex, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [roomGuests]);

  useEffect(() => {
    const firstKey = Object.keys(fieldErrors)[0];
    if (!firstKey || !formRef.current) return;
    const el = formRef.current.querySelector<HTMLElement>(
      `[data-field="${firstKey}"], #field-${firstKey}`,
    );
    el?.focus();
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fieldErrors]);

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
      phoneCountry,
      email,
      emailConfirm,
      paymentMethod,
      termsAccepted,
      roomGuests,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    onSubmit();
  }

  return (
    <div className="shop-flight-checkout shop-hotel-checkout" ref={formRef}>
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
      </div>

      {error ? <p className="shop-error">{error}</p> : null}

      <div className="shop-flight-checkout-layout">
        <div className="shop-flight-checkout-main">
          <section className="shop-flight-checkout-card">
            <h2>بيانات صاحب الطلب</h2>
            <div className="shop-flight-contact-grid">
              <label htmlFor="field-name">
                الاسم الكامل
                <input
                  id="field-name"
                  name="holderName"
                  data-field="name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.name)}
                />
                {fieldErrors.name ? <em className="shop-field-error">{fieldErrors.name}</em> : null}
              </label>
              <label htmlFor="field-phoneCountry">
                مفتاح الدولة
                <select
                  id="field-phoneCountry"
                  name="phoneCountry"
                  data-field="phoneCountry"
                  value={phoneCountry}
                  onChange={(e) => setPhoneCountry(e.target.value)}
                  required
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.phoneCountry ? (
                  <em className="shop-field-error">{fieldErrors.phoneCountry}</em>
                ) : null}
              </label>
              <label htmlFor="field-phone">
                رقم الجوال
                <input
                  id="field-phone"
                  name="phone"
                  data-field="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99999999"
                  aria-invalid={Boolean(fieldErrors.phone)}
                />
                {fieldErrors.phone ? <em className="shop-field-error">{fieldErrors.phone}</em> : null}
              </label>
              <label htmlFor="field-email">
                البريد الإلكتروني
                <input
                  id="field-email"
                  name="email"
                  data-field="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                {fieldErrors.email ? <em className="shop-field-error">{fieldErrors.email}</em> : null}
              </label>
              <label htmlFor="field-emailConfirm">
                تأكيد البريد
                <input
                  id="field-emailConfirm"
                  name="emailConfirm"
                  data-field="emailConfirm"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.emailConfirm)}
                />
                {fieldErrors.emailConfirm ? (
                  <em className="shop-field-error">{fieldErrors.emailConfirm}</em>
                ) : null}
              </label>
            </div>
          </section>

          {roomsGrouped.map(([roomIndex, guests]) => (
            <section key={roomIndex} className="shop-flight-checkout-card">
              <h2>نزلاء الغرفة {roomIndex + 1}</h2>
              {fieldErrors[`room-${roomIndex}-lead`] ? (
                <p className="shop-field-error" id={`field-room-${roomIndex}-lead`}>
                  {fieldErrors[`room-${roomIndex}-lead`]}
                </p>
              ) : null}
              {guests.map((guest, idx) => {
                const key = `guest-${roomIndex}-${idx}`;
                return (
                  <div key={key} className="shop-hotel-guest-block">
                    <div className="shop-form-row shop-hotel-guest-row">
                      <label htmlFor={`${key}-title`}>
                        اللقب
                        <select
                          id={`${key}-title`}
                          name={`${key}-title`}
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
                      <label htmlFor={`${key}-first`}>
                        الاسم الأول
                        <input
                          id={`${key}-first`}
                          name={`${key}-first`}
                          data-field={`${key}-first`}
                          autoComplete="given-name"
                          required
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
                      <label htmlFor={`${key}-last`}>
                        اسم العائلة
                        <input
                          id={`${key}-last`}
                          name={`${key}-last`}
                          data-field={`${key}-last`}
                          autoComplete="family-name"
                          required
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
                    <div className="shop-form-row shop-hotel-guest-row">
                      <label htmlFor={`${key}-firstEn`}>
                        الاسم الأول (إنجليزي / جواز)
                        <input
                          id={`${key}-firstEn`}
                          name={`${key}-firstEn`}
                          data-field={`${key}-firstEn`}
                          autoComplete="off"
                          lang="en"
                          dir="ltr"
                          required
                          value={guest.firstNameEn || ""}
                          onChange={(e) =>
                            updateGuest(roomIndex, idx, { firstNameEn: e.target.value })
                          }
                          placeholder="First name as in passport"
                          aria-invalid={Boolean(fieldErrors[`${key}-firstEn`])}
                        />
                        {fieldErrors[`${key}-firstEn`] ? (
                          <em className="shop-field-error">{fieldErrors[`${key}-firstEn`]}</em>
                        ) : null}
                      </label>
                      <label htmlFor={`${key}-lastEn`}>
                        اسم العائلة (إنجليزي / جواز)
                        <input
                          id={`${key}-lastEn`}
                          name={`${key}-lastEn`}
                          data-field={`${key}-lastEn`}
                          autoComplete="off"
                          lang="en"
                          dir="ltr"
                          required
                          value={guest.lastNameEn || ""}
                          onChange={(e) =>
                            updateGuest(roomIndex, idx, { lastNameEn: e.target.value })
                          }
                          placeholder="Family name as in passport"
                          aria-invalid={Boolean(fieldErrors[`${key}-lastEn`])}
                        />
                        {fieldErrors[`${key}-lastEn`] ? (
                          <em className="shop-field-error">{fieldErrors[`${key}-lastEn`]}</em>
                        ) : null}
                      </label>
                    </div>
                    <div className="shop-form-row shop-hotel-guest-meta">
                      <label htmlFor={`${key}-type`}>
                        النوع
                        <select
                          id={`${key}-type`}
                          name={`${key}-type`}
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
                        <label htmlFor={`${key}-age`}>
                          العمر
                          <select
                            id={`${key}-age`}
                            name={`${key}-age`}
                            data-field={`${key}-age`}
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
                      <label className="shop-hotel-lead-check" htmlFor={`${key}-lead`}>
                        <input
                          id={`${key}-lead`}
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
            <label htmlFor="field-special">
              ملاحظات للفندق
              <textarea
                id="field-special"
                name="specialRequests"
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
              <em className="shop-field-error" id="field-paymentMethod">
                {fieldErrors.paymentMethod}
              </em>
            ) : null}
            <label className="shop-hotel-terms" htmlFor="field-terms">
              <input
                id="field-terms"
                name="terms"
                data-field="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                required
              />
              أوافق على الشروط وسياسة الإلغاء والاسترداد
            </label>
            {fieldErrors.terms ? (
              <em className="shop-field-error">{fieldErrors.terms}</em>
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
          <HotelPricePanel
            currency={currency}
            nights={nights}
            breakdown={breakdown}
            variant="aside"
            emphasizeTotal
          />
        </aside>
      </div>
    </div>
  );
}
