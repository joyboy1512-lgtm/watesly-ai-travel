"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { useTripBuilder } from "./TripBuilderProvider";
import { TripProgressStepper } from "./TripProgressStepper";
import { MOCKUP_TRIP, money } from "./mockup-data";

export function TripTravelersForm() {
  const router = useRouter();
  const { draft, patchDraft } = useTripBuilder();
  const [termsOk, setTermsOk] = useState(false);
  const [whatsappOk, setWhatsappOk] = useState(true);
  const [openExtra, setOpenExtra] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dest =
    draft.flight.destinationLabel || draft.flight.destination || MOCKUP_TRIP.destinationAr;
  const prices = MOCKUP_TRIP.prices;

  const existing = (draft.travelers?.[0] || {}) as Record<string, string>;
  const [title, setTitle] = useState(existing.title || "Mr");
  const [firstNameEn, setFirstNameEn] = useState(existing.firstNameEn || existing.firstNameEn || "");
  const [lastNameEn, setLastNameEn] = useState(existing.lastNameEn || existing.lastNameEn || "");
  const [gender, setGender] = useState(existing.gender || "M");
  const [dateOfBirth, setDateOfBirth] = useState(existing.dateOfBirth || existing.dateOfBirth || "");
  const [nationality, setNationality] = useState(existing.nationality || "KW");
  const [passportNumber, setPassportNumber] = useState(
    existing.passportNumber || existing.passportNumber || "",
  );
  const [passportExpiry, setPassportExpiry] = useState(
    existing.passportExpiry || existing.passportExpiry || "",
  );

  const c = draft.contact as unknown as Record<string, string>;
  const [phoneCountry, setPhoneCountry] = useState(c?.phoneCountry || "+965");
  const [phone, setPhone] = useState(c?.phone || "");
  const [email, setEmail] = useState(c?.email || "");
  const [emailConfirm, setEmailConfirm] = useState(c?.emailConfirm || "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!firstNameEn.trim()) err.firstNameEn = "مطلوب";
    if (!lastNameEn.trim()) err.lastNameEn = "مطلوب";
    if (!dateOfBirth) err.dateOfBirth = "مطلوب";
    if (!passportNumber.trim()) err.passportNumber = "مطلوب";
    if (!passportExpiry) err.passportExpiry = "مطلوب";
    if (!phone.trim()) err.phone = "مطلوب";
    if (!email.trim()) err.email = "مطلوب";
    if (email !== emailConfirm) err.emailConfirm = "البريد غير متطابق";
    if (!termsOk) err.terms = "يجب الموافقة على الشروط";
    setErrors(err);
    if (Object.keys(err).length) return;

    patchDraft({
      travelers: [
        {
          title,
          firstNameEn,
          lastNameEn,
          gender,
          dateOfBirth,
          nationality,
          passportNumber,
          passportExpiry,
        },
      ] as never,
      contact: {
        phoneCountry,
        phone,
        email,
        emailConfirm,
        whatsappUpdates: whatsappOk,
      } as never,
    });
    router.push("/trip-builder/payment");
  }

  return (
    <form className="wg-ru-page" dir="rtl" onSubmit={submit} noValidate>
      <TripProgressStepper current="travelers" />

      <header className="wg-ru-hero-head">
        <h1>راجع رحلتك وأدخل بيانات المسافر</h1>
        <p>احجز جميع خدمات رحلتك في خطوة واحدة</p>
      </header>

      <div className="wg-ru-layout">
        <div className="wg-ru-main">
          <div className="wg-ru-ticket-card">
            <div>
              <h3>رحلتك إلى {dest}</h3>
              <p className="wg-ru-route">
                {MOCKUP_TRIP.originCode} <span aria-hidden>✈</span> {MOCKUP_TRIP.destCode}
              </p>
              <p className="wg-ru-muted">
                {MOCKUP_TRIP.dateFromAr} — {MOCKUP_TRIP.dateToAr}
              </p>
              <div className="wg-ru-service-pills">
                <span>✓ طيران</span>
                <span>✓ فندق</span>
                <span>✓ مواصلات</span>
                <span>✓ أنشطة</span>
              </div>
            </div>
            <button
              type="button"
              className="wg-ru-link-btn"
              onClick={() => router.push("/trip-builder/results")}
            >
              عرض التفاصيل ←
            </button>
          </div>

          <div className="wg-ru-form-card">
            <h3>👤 بيانات المسافر 1</h3>
            <p className="wg-ru-info-note">ℹ تأكد أن البيانات مطابقة لجواز السفر</p>
            <div className="wg-ru-form-grid3">
              <label>
                اللقب
                <select value={title} onChange={(e) => setTitle(e.target.value)}>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                </select>
              </label>
              <label>
                الاسم الأول بالإنجليزي
                <input
                  value={firstNameEn}
                  onChange={(e) => setFirstNameEn(e.target.value)}
                  autoComplete="given-name"
                />
                {errors.firstNameEn ? <em>{errors.firstNameEn}</em> : null}
              </label>
              <label>
                اسم العائلة بالإنجليزي
                <input
                  value={lastNameEn}
                  onChange={(e) => setLastNameEn(e.target.value)}
                  autoComplete="family-name"
                />
                {errors.lastNameEn ? <em>{errors.lastNameEn}</em> : null}
              </label>
              <label>
                الجنس
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="M">ذكر</option>
                  <option value="F">أنثى</option>
                </select>
              </label>
              <label>
                تاريخ الميلاد
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
                {errors.dateOfBirth ? <em>{errors.dateOfBirth}</em> : null}
              </label>
              <label>
                الجنسية
                <select value={nationality} onChange={(e) => setNationality(e.target.value)}>
                  <option value="KW">الكويت</option>
                  <option value="SA">السعودية</option>
                  <option value="AE">الإمارات</option>
                  <option value="BH">البحرين</option>
                  <option value="QA">قطر</option>
                  <option value="OM">عُمان</option>
                </select>
              </label>
              <label>
                رقم جواز السفر
                <input
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                />
                {errors.passportNumber ? <em>{errors.passportNumber}</em> : null}
              </label>
              <label>
                تاريخ انتهاء الجواز
                <input
                  type="date"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                />
                {errors.passportExpiry ? <em>{errors.passportExpiry}</em> : null}
              </label>
            </div>
          </div>

          <div className="wg-ru-form-card">
            <h3>📱 بيانات التواصل</h3>
            <div className="wg-ru-form-grid3">
              <label className="wg-ru-phone-field">
                رقم الهاتف
                <div className="wg-ru-phone-row">
                  <select
                    value={phoneCountry}
                    onChange={(e) => setPhoneCountry(e.target.value)}
                  >
                    <option value="+965">🇰🇼 +965</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+971">🇦🇪 +971</option>
                  </select>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="90053224"
                  />
                  <a
                    className="wg-ru-wa-inline"
                    href={COMPANY_LEGAL.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="واتساب"
                  >
                    واتساب
                  </a>
                </div>
                {errors.phone ? <em>{errors.phone}</em> : null}
              </label>
              <label>
                البريد الإلكتروني
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email ? <em>{errors.email}</em> : null}
              </label>
              <label>
                تأكيد البريد الإلكتروني
                <input
                  type="email"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                />
                {errors.emailConfirm ? <em>{errors.emailConfirm}</em> : null}
              </label>
            </div>
            <label className="wg-ru-check-row">
              <input
                type="checkbox"
                checked={whatsappOk}
                onChange={(e) => setWhatsappOk(e.target.checked)}
              />
              <span>أرسل تفاصيل الحجز عبر واتساب</span>
            </label>
          </div>

          {(
            [
              ["hotel", "🛏", "طلبات الفندق", "نوع السرير / وصول متأخر"],
              ["transfer", "🚗", "بيانات رحلة الوصول للمواصلات", "رقم الرحلة ووقت الهبوط"],
              ["special", "♿", "طلبات خاصة أو احتياجات مساعدة", "كرسي متحرك / ملاحظات"],
            ] as const
          ).map(([key, ico, titleText, hint]) => (
            <button
              key={key}
              type="button"
              className="wg-ru-accordion"
              aria-expanded={openExtra === key}
              onClick={() => setOpenExtra(openExtra === key ? null : key)}
            >
              <span>
                {ico} {titleText}
                <small>{hint}</small>
              </span>
              <span aria-hidden>{openExtra === key ? "▾" : "◂"}</span>
            </button>
          ))}

          <label className="wg-ru-check-row wg-ru-terms">
            <input
              type="checkbox"
              checked={termsOk}
              onChange={(e) => setTermsOk(e.target.checked)}
            />
            <span>
              أوافق على شروط الحجز وسياسة الإلغاء والخصوصية
              {errors.terms ? <em> — {errors.terms}</em> : null}
            </span>
          </label>
        </div>

        <aside className="wg-ru-aside">
          <div className="wg-ru-summary-card">
            <h3>ملخص السعر</h3>
            <div className="wg-ru-sum-line">
              <span>✈ الطيران</span>
              <span>{money(prices.flight)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🏨 الفندق</span>
              <span>{money(prices.hotel)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🚗 المواصلات</span>
              <span>{money(prices.transfer)}</span>
            </div>
            <div className="wg-ru-sum-line">
              <span>🎟 الأنشطة</span>
              <span>{money(prices.activities)}</span>
            </div>
            <div className="wg-ru-sum-total">
              <span>الإجمالي</span>
              <strong>{money(prices.total)}</strong>
            </div>
            <p className="wg-ru-muted">شامل الضرائب والرسوم</p>
            <p className="wg-ru-verified">✓ تم التحقق من السعر الآن</p>
            <button type="submit" className="wg-ru-primary-btn">
              الانتقال إلى الدفع
            </button>
            <p className="wg-ru-secure">🔒 دفع آمن ومشفّر</p>
          </div>
        </aside>
      </div>
    </form>
  );
}
