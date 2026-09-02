"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultContact,
  firstErrorField,
  mergeValidationErrors,
  validateContact,
  validateTraveler,
  type TripTravelerDraft,
} from "@watesly-travel/shared";
import { formatKwdMinor } from "@/lib/platform-api";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";

function emptyTraveler(): TripTravelerDraft {
  return {
    title: "Mr",
    firstNameEn: "",
    lastNameEn: "",
    gender: "M",
    dateOfBirth: "",
    nationality: "KW",
    passportNumber: "",
    passportExpiry: "",
  };
}

export function TripTravelersForm() {
  const router = useRouter();
  const { draft, patchDraft } = useTripBuilder();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [termsOk, setTermsOk] = useState(false);

  const travelers = useMemo(() => {
    if (draft.travelers.length >= draft.flight.adults) return draft.travelers;
    const list = [...draft.travelers];
    while (list.length < draft.flight.adults) list.push(emptyTraveler());
    return list;
  }, [draft.travelers, draft.flight.adults]);

  const contact = draft.contact || defaultContact();

  const total = useMemo(() => {
    let sum = 0;
    const o = draft.selectedOffers;
    if (o.flight) sum += o.flight.sellAmountMinor;
    if (o.hotel) sum += o.hotel.sellAmountMinor;
    if (o.transfer) sum += o.transfer.sellAmountMinor;
    if (o.activity) sum += o.activity.sellAmountMinor;
    return sum;
  }, [draft.selectedOffers]);

  function updateTraveler(index: number, patch: Partial<TripTravelerDraft>) {
    const next = travelers.map((t, i) => (i === index ? { ...t, ...patch } : t));
    patchDraft({ travelers: next });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const travelerErrors = travelers.flatMap((t, i) => {
      const m = validateTraveler(t, i);
      return Object.entries(m);
    });
    const contactErrors = validateContact(contact);
    const merged = mergeValidationErrors(
      Object.fromEntries(travelerErrors),
      contactErrors,
    );
    if (!termsOk) merged.terms = "يجب الموافقة على الشروط";
    setErrors(merged);
    const first = firstErrorField(merged);
    if (first) {
      document.getElementById(first)?.focus();
      return;
    }
    patchDraft({ travelers, contact });
    router.push("/trip-builder/payment");
  }

  return (
    <form className="wg-trip-flow" onSubmit={submit} noValidate>
      <TripProgressStepper current="travelers" />

      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0, color: "var(--tv-primary,#13357b)" }}>
          راجع رحلتك وأدخل بيانات المسافر
        </h1>
        <p style={{ color: "var(--wg-muted)" }}>احجز جميع خدمات رحلتك في خطوة واحدة</p>
      </header>

      <div className="wg-trip-grid">
        <div>
          <div className="wg-trip-card" style={{ marginBottom: "1rem" }}>
            <h3>ملخص الرحلة</h3>
            <p>
              {draft.flight.origin} → {draft.flight.destination}
              {" · "}
              {draft.flight.departDate}
              {draft.flight.returnDate ? ` — ${draft.flight.returnDate}` : ""}
            </p>
          </div>

          {travelers.map((t, i) => (
            <div key={i} className="wg-trip-card" style={{ marginBottom: "1rem" }}>
              <h3>بيانات المسافر {i + 1}</h3>
              <div className="wg-trip-form-grid">
                <label>
                  اللقب
                  <select
                    value={t.title}
                    onChange={(e) => updateTraveler(i, { title: e.target.value })}
                  >
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                  </select>
                </label>
                <label htmlFor={`traveler_${i}_firstNameEn`}>
                  الاسم الأول (إنجليزي)
                  <input
                    id={`traveler_${i}_firstNameEn`}
                    value={t.firstNameEn}
                    onChange={(e) => updateTraveler(i, { firstNameEn: e.target.value })}
                    autoComplete="given-name"
                  />
                  {errors[`traveler_${i}_firstNameEn`] ? (
                    <span className="wg-trip-field-error">{errors[`traveler_${i}_firstNameEn`]}</span>
                  ) : null}
                </label>
                <label htmlFor={`traveler_${i}_lastNameEn`}>
                  اسم العائلة (إنجليزي)
                  <input
                    id={`traveler_${i}_lastNameEn`}
                    value={t.lastNameEn}
                    onChange={(e) => updateTraveler(i, { lastNameEn: e.target.value })}
                    autoComplete="family-name"
                  />
                  {errors[`traveler_${i}_lastNameEn`] ? (
                    <span className="wg-trip-field-error">{errors[`traveler_${i}_lastNameEn`]}</span>
                  ) : null}
                </label>
                <label>
                  الجنس
                  <select
                    value={t.gender}
                    onChange={(e) => updateTraveler(i, { gender: e.target.value })}
                  >
                    <option value="M">ذكر</option>
                    <option value="F">أنثى</option>
                  </select>
                </label>
                <label htmlFor={`traveler_${i}_dob`}>
                  تاريخ الميلاد
                  <input
                    id={`traveler_${i}_dob`}
                    type="date"
                    value={t.dateOfBirth}
                    onChange={(e) => updateTraveler(i, { dateOfBirth: e.target.value })}
                  />
                  {errors[`traveler_${i}_dob`] ? (
                    <span className="wg-trip-field-error">{errors[`traveler_${i}_dob`]}</span>
                  ) : null}
                </label>
                <label>
                  الجنسية
                  <input
                    value={t.nationality}
                    onChange={(e) => updateTraveler(i, { nationality: e.target.value })}
                  />
                </label>
                <label htmlFor={`traveler_${i}_passport`}>
                  رقم الجواز
                  <input
                    id={`traveler_${i}_passport`}
                    value={t.passportNumber}
                    onChange={(e) => updateTraveler(i, { passportNumber: e.target.value })}
                  />
                  {errors[`traveler_${i}_passport`] ? (
                    <span className="wg-trip-field-error">{errors[`traveler_${i}_passport`]}</span>
                  ) : null}
                </label>
                <label htmlFor={`traveler_${i}_passportExpiry`}>
                  انتهاء الجواز
                  <input
                    id={`traveler_${i}_passportExpiry`}
                    type="date"
                    value={t.passportExpiry}
                    onChange={(e) => updateTraveler(i, { passportExpiry: e.target.value })}
                  />
                  {errors[`traveler_${i}_passportExpiry`] ? (
                    <span className="wg-trip-field-error">{errors[`traveler_${i}_passportExpiry`]}</span>
                  ) : null}
                </label>
              </div>
            </div>
          ))}

          <div className="wg-trip-card" style={{ marginBottom: "1rem" }}>
            <h3>بيانات التواصل</h3>
            <div className="wg-trip-form-grid">
              <label>
                مفتاح الدولة
                <input
                  value={contact.phoneCountry}
                  onChange={(e) =>
                    patchDraft({ contact: { ...contact, phoneCountry: e.target.value } })
                  }
                />
              </label>
              <label htmlFor="phone">
                رقم الهاتف
                <input
                  id="phone"
                  value={contact.phone}
                  onChange={(e) => patchDraft({ contact: { ...contact, phone: e.target.value } })}
                  autoComplete="tel"
                />
                {errors.phone ? <span className="wg-trip-field-error">{errors.phone}</span> : null}
              </label>
              <label htmlFor="email">
                البريد الإلكتروني
                <input
                  id="email"
                  type="email"
                  value={contact.email}
                  onChange={(e) => patchDraft({ contact: { ...contact, email: e.target.value } })}
                  autoComplete="email"
                />
                {errors.email ? <span className="wg-trip-field-error">{errors.email}</span> : null}
              </label>
              <label htmlFor="emailConfirm">
                تأكيد البريد
                <input
                  id="emailConfirm"
                  type="email"
                  value={contact.emailConfirm}
                  onChange={(e) =>
                    patchDraft({ contact: { ...contact, emailConfirm: e.target.value } })
                  }
                />
                {errors.emailConfirm ? (
                  <span className="wg-trip-field-error">{errors.emailConfirm}</span>
                ) : null}
              </label>
              <label style={{ gridColumn: "1 / -1" }}>
                <input
                  type="checkbox"
                  checked={contact.whatsappUpdates}
                  onChange={(e) =>
                    patchDraft({ contact: { ...contact, whatsappUpdates: e.target.checked } })
                  }
                />{" "}
                إرسال تفاصيل الحجز عبر واتساب
              </label>
            </div>
          </div>

          <label className="wg-trip-card" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={termsOk}
              onChange={(e) => setTermsOk(e.target.checked)}
            />
            <span>
              أوافق على الشروط وسياسة الإلغاء والخصوصية
              {errors.terms ? <span className="wg-trip-field-error"> — {errors.terms}</span> : null}
            </span>
          </label>
        </div>

        <aside className="wg-trip-sticky-price">
          <h3>ملخص السعر</h3>
          <p className="total">{formatKwdMinor(total)}</p>
          <p style={{ fontSize: "0.82rem", color: "#18785a" }}>✓ السعر محقق الآن</p>
          <button type="submit" className="wg-trip-primary-btn">
            الانتقال إلى الدفع
          </button>
          <p style={{ fontSize: "0.75rem", color: "var(--wg-muted)", marginTop: "0.5rem" }}>
            🔒 دفع آمن ومشفّر
          </p>
        </aside>
      </div>
    </form>
  );
}
