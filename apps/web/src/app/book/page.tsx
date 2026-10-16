"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import "../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  clearBookingDraft,
  getBookingDraft,
  type BookingDraft,
  type FlightBookingDraft,
} from "@/lib/booking-draft";
import { formatDay } from "@/lib/flight-search";
import { formatMoneyMinor } from "@/lib/format";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { HotelCheckout, validateHotelCheckout } from "@/components/hotels/HotelCheckout";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import type { HotelBookingDraft, HotelRoomGuestDraft } from "@/lib/booking-draft";
import { compressPassportImage } from "@/lib/compress-passport-image";
import { FamilyTravelerPicker } from "@/components/shop/FamilyTravelerPicker";
import { loadFamilySelection } from "@/lib/family-travelers";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { airportPlaceLabel } from "@/lib/airport-cities";

function buildHotelRoomGuests(draft: HotelBookingDraft): HotelRoomGuestDraft[] {
  if (draft.roomGuests?.length) return draft.roomGuests;
  const occ =
    draft.roomOccupancies?.length
      ? draft.roomOccupancies
      : [
          {
            adults: draft.adults,
            childAges: draft.childAges || Array.from({ length: draft.children }, () => 8),
          },
        ];
  const guests: HotelRoomGuestDraft[] = [];
  occ.forEach((room, roomIndex) => {
    for (let a = 0; a < Math.max(1, room.adults); a += 1) {
      guests.push({
        roomIndex,
        isLead: a === 0,
        title: "mr",
        firstName: "",
        lastName: "",
        type: "adult",
      });
    }
    (room.childAges || []).forEach((age) => {
      guests.push({
        roomIndex,
        isLead: false,
        title: "miss",
        firstName: "",
        lastName: "",
        type: "child",
        age,
      });
    });
  });
  return guests.length
    ? guests
    : [{ roomIndex: 0, isLead: true, title: "mr", firstName: "", lastName: "", type: "adult" }];
}

type Traveler = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportIssueDate: string;
  passportExpiry: string;
  gender: string;
};

function emptyTraveler(): Traveler {
  return {
    title: "mr",
    firstName: "",
    middleName: "",
    lastName: "",
    birthDate: "",
    nationality: "KW",
    passportNumber: "",
    passportIssueDate: "",
    passportExpiry: "",
    gender: "male",
  };
}

function titleLabel(title?: string, gender?: string) {
  if (title === "mrs" || title === "ms" || gender === "female") return "Mrs";
  if (title === "mr" || gender === "male") return "Mr";
  return "";
}

function genderToTitle(gender: string) {
  return gender === "female" ? "mrs" : gender === "male" ? "mr" : "mr";
}

function draftPrice(draft: BookingDraft) {
  if (draft.serviceType === "flight") return draft.flight.sellAmountMinor;
  if (draft.serviceType === "hotel") return draft.hotel.sellAmountMinor;
  if (draft.serviceType === "transfer") return draft.transfer.sellAmountMinor;
  return draft.activity.sellAmountMinor;
}

function draftCurrency(draft: BookingDraft) {
  if (draft.serviceType === "flight") return draft.flight.currency;
  if (draft.serviceType === "hotel") return draft.hotel.currency;
  if (draft.serviceType === "transfer") return draft.transfer.currency;
  return draft.activity.currency;
}

function draftTitle(draft: BookingDraft) {
  if (draft.serviceType === "flight") return draft.flight.description;
  if (draft.serviceType === "hotel") return draft.hotel.description;
  if (draft.serviceType === "transfer") return draft.transfer.description;
  return draft.activity.description;
}

function travelerComplete(t: Traveler) {
  return Boolean(
    t.firstName.trim() &&
      t.lastName.trim() &&
      t.gender &&
      t.birthDate &&
      t.nationality.trim() &&
      t.passportNumber.trim() &&
      t.passportIssueDate &&
      t.passportExpiry,
  );
}

function splitBirthDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { y: "", m: "", d: "" };
  const [y, m, d] = iso.split("-");
  return { y: y || "", m: m || "", d: d || "" };
}

function titleToGender(title?: string) {
  if (title === "ms" || title === "mrs") return "female";
  if (title === "mr") return "male";
  return "";
}

function joinBirthDate(y: string, m: string, d: string) {
  if (!y || !m || !d) return "";
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const MONTHS = [
  { v: "01", ar: "يناير", en: "January" },
  { v: "02", ar: "فبراير", en: "February" },
  { v: "03", ar: "مارس", en: "March" },
  { v: "04", ar: "أبريل", en: "April" },
  { v: "05", ar: "مايو", en: "May" },
  { v: "06", ar: "يونيو", en: "June" },
  { v: "07", ar: "يوليو", en: "July" },
  { v: "08", ar: "أغسطس", en: "August" },
  { v: "09", ar: "سبتمبر", en: "September" },
  { v: "10", ar: "أكتوبر", en: "October" },
  { v: "11", ar: "نوفمبر", en: "November" },
  { v: "12", ar: "ديسمبر", en: "December" },
];

const PASSPORT_COUNTRIES = [
  { code: "KW", ar: "الكويت", en: "Kuwait" },
  { code: "SA", ar: "السعودية", en: "Saudi Arabia" },
  { code: "AE", ar: "الإمارات", en: "United Arab Emirates" },
  { code: "BH", ar: "البحرين", en: "Bahrain" },
  { code: "QA", ar: "قطر", en: "Qatar" },
  { code: "OM", ar: "عمان", en: "Oman" },
  { code: "EG", ar: "مصر", en: "Egypt" },
  { code: "JO", ar: "الأردن", en: "Jordan" },
  { code: "LB", ar: "لبنان", en: "Lebanon" },
  { code: "IQ", ar: "العراق", en: "Iraq" },
  { code: "IN", ar: "الهند", en: "India" },
  { code: "PK", ar: "باكستان", en: "Pakistan" },
  { code: "PH", ar: "الفلبين", en: "Philippines" },
  { code: "GB", ar: "المملكة المتحدة", en: "United Kingdom" },
  { code: "US", ar: "الولايات المتحدة", en: "United States" },
  { code: "OTHER", ar: "أخرى", en: "Other" },
];

function DatePartsRow({
  value,
  onChange,
  labels,
  locale,
}: {
  value: { y: string; m: string; d: string };
  onChange: (part: Partial<{ y: string; m: string; d: string }>) => void;
  labels: { month: string; day: string; year: string };
  locale: "ar" | "en";
}) {
  return (
    <div className="shop-traveler-dob">
      <select
        value={value.m}
        onChange={(e) => onChange({ m: e.target.value })}
        aria-label={labels.month}
      >
        <option value="">{labels.month}</option>
        {MONTHS.map((m) => (
          <option key={m.v} value={m.v}>
            {m[locale]}
          </option>
        ))}
      </select>
      <input
        inputMode="numeric"
        placeholder={locale === "en" ? "Day" : "يوم"}
        aria-label={labels.day}
        maxLength={2}
        value={value.d}
        onChange={(e) => onChange({ d: e.target.value.replace(/\D/g, "") })}
      />
      <input
        inputMode="numeric"
        placeholder={locale === "en" ? "Year" : "سنة"}
        aria-label={labels.year}
        maxLength={4}
        value={value.y}
        onChange={(e) => onChange({ y: e.target.value.replace(/\D/g, "") })}
      />
    </div>
  );
}

function FlightCheckout({
  draft,
  travelers,
  setTravelers,
  email,
  setEmail,
  phone,
  setPhone,
  name,
  setName,
  error,
  submitting,
  onSubmit,
}: {
  draft: FlightBookingDraft;
  travelers: Traveler[];
  setTravelers: Dispatch<SetStateAction<Traveler[]>>;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  error: string;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const { locale } = useShopCopy();
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [dobDraft, setDobDraft] = useState({ y: "", m: "", d: "" });
  const [issueDraft, setIssueDraft] = useState({ y: "", m: "", d: "" });
  const [expiryDraft, setExpiryDraft] = useState({ y: "", m: "", d: "" });
  const [showOptional, setShowOptional] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const scanTargetRef = useRef<number>(0);
  const ignoreBackdropCloseRef = useRef(false);
  const baggage = (draft.flight.details.baggage || {}) as Record<string, string>;
  const tripLabel =
    draft.tripType === "roundtrip"
      ? locale === "en"
        ? "Round trip"
        : "ذهاب وعودة"
      : draft.tripType === "multicity"
        ? locale === "en"
          ? "Multi-city"
          : "وجهات متعددة"
        : locale === "en"
          ? "One way"
          : "اتجاه واحد";
  const pax = draft.adults + draft.children;
  const dateLabel = [
    formatDay(draft.departDate, locale),
    draft.returnDate ? formatDay(draft.returnDate, locale) : "",
  ]
    .filter(Boolean)
    .join(" – ");

  const editing = editIndex != null ? travelers[editIndex] : null;

  useEffect(() => {
    if (editIndex == null) return;
    const row = travelers[editIndex];
    setDobDraft(splitBirthDate(row?.birthDate || ""));
    setIssueDraft(splitBirthDate(row?.passportIssueDate || ""));
    setExpiryDraft(splitBirthDate(row?.passportExpiry || ""));
    setShowOptional(false);
    setScanHint("");
  }, [editIndex]);

  function updateEditing(patch: Partial<Traveler>) {
    if (editIndex == null) return;
    setTravelers((rows) =>
      rows.map((row, i) => (i === editIndex ? { ...row, ...patch } : row)),
    );
  }

  function updateDatePart(
    kind: "dob" | "issue" | "expiry",
    part: Partial<{ y: string; m: string; d: string }>,
  ) {
    const current =
      kind === "dob" ? dobDraft : kind === "issue" ? issueDraft : expiryDraft;
    const next = { ...current, ...part };
    if (kind === "dob") {
      setDobDraft(next);
      updateEditing({ birthDate: joinBirthDate(next.y, next.m, next.d) });
    } else if (kind === "issue") {
      setIssueDraft(next);
      updateEditing({ passportIssueDate: joinBirthDate(next.y, next.m, next.d) });
    } else {
      setExpiryDraft(next);
      updateEditing({ passportExpiry: joinBirthDate(next.y, next.m, next.d) });
    }
  }

  function openPassportPicker() {
    if (editIndex == null) return;
    scanTargetRef.current = editIndex;
    setScanHint("");
    // Native file/camera dialog can fire a click on the backdrop when it closes.
    ignoreBackdropCloseRef.current = true;
    window.setTimeout(() => {
      ignoreBackdropCloseRef.current = false;
    }, 1200);
    passportInputRef.current?.click();
  }

  function closeTravelerModal() {
    if (scanning || ignoreBackdropCloseRef.current) return;
    setEditIndex(null);
  }

  async function onPassportSelected(file?: File | null) {
    const targetIndex = scanTargetRef.current;
    if (!file) return;
    const looksImage =
      file.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || "");
    if (!looksImage) {
      setEditIndex(targetIndex);
      setScanHint(
        locale === "en"
          ? "Choose a passport image (JPG or PNG)"
          : "اختر صورة جواز سفر (JPG أو PNG)",
      );
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setEditIndex(targetIndex);
      setScanHint(
        locale === "en"
          ? "The image is too large. Use an image smaller than 6 MB"
          : "حجم الصورة كبير. استخدم صورة أصغر من 6MB",
      );
      return;
    }

    // Keep modal open while scanning (file dialog may have closed it).
    setEditIndex(targetIndex);
    setScanning(true);
    setScanHint(locale === "en" ? "Compressing image…" : "جارٍ ضغط الصورة...");
    try {
      const { base64: imageBase64, mimeType } = await compressPassportImage(file);
      setScanHint(locale === "en" ? "Analyzing passport image…" : "جارٍ تحليل صورة الجواز...");
      const result = await shopFetch<{
        fields: Partial<Traveler & { title?: string }>;
        confidence: number;
        notes?: string;
      }>("/shop/passport-scan", {
        method: "POST",
        timeoutMs: 45000,
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      const f = result.fields || {};
      const filled = Boolean(
        f.firstName || f.lastName || f.birthDate || f.passportNumber,
      );
      setEditIndex(targetIndex);
      if (!filled) {
        setScanHint(
          locale === "en"
            ? "Could not read enough data from the image. Try a clearer passport photo page."
            : result.notes ||
              "تعذر قراءة بيانات كافية من الصورة. جرّب صورة أوضح لصفحة الجواز (الوجه الأمامي مع السطر السفلي).",
        );
        return;
      }
      const gender =
        titleToGender(f.title) ||
        (typeof (f as { gender?: string }).gender === "string"
          ? String((f as { gender?: string }).gender).toLowerCase()
          : "") ||
        travelers[targetIndex]?.gender ||
        "";
      const title = gender
        ? genderToTitle(gender)
        : f.title === "mrs" || f.title === "ms"
          ? "mrs"
          : f.title === "mr"
            ? "mr"
            : travelers[targetIndex]?.title || "mr";
      const nextBirth = f.birthDate ? String(f.birthDate).slice(0, 10) : "";
      const nextIssue = f.passportIssueDate
        ? String(f.passportIssueDate).slice(0, 10)
        : "";
      const nextExpiry = f.passportExpiry
        ? String(f.passportExpiry).slice(0, 10)
        : "";
      setTravelers((rows) =>
        rows.map((row, i) =>
          i === targetIndex
            ? {
                ...row,
                ...(f.firstName ? { firstName: String(f.firstName).trim() } : {}),
                ...(f.middleName
                  ? { middleName: String(f.middleName).trim() }
                  : {}),
                ...(f.lastName ? { lastName: String(f.lastName).trim() } : {}),
                ...(nextBirth ? { birthDate: nextBirth } : {}),
                ...(f.nationality
                  ? { nationality: String(f.nationality).toUpperCase() }
                  : {}),
                ...(f.passportNumber
                  ? {
                      passportNumber: String(f.passportNumber)
                        .replace(/\s+/g, "")
                        .toUpperCase(),
                    }
                  : {}),
                ...(nextIssue ? { passportIssueDate: nextIssue } : {}),
                ...(nextExpiry ? { passportExpiry: nextExpiry } : {}),
                ...(gender ? { gender, title } : f.title ? { title } : {}),
              }
            : row,
        ),
      );
      if (nextBirth) setDobDraft(splitBirthDate(nextBirth));
      if (nextIssue) setIssueDraft(splitBirthDate(nextIssue));
      if (nextExpiry) setExpiryDraft(splitBirthDate(nextExpiry));
      const pct = Math.round((result.confidence || 0) * 100);
      setScanHint(
        locale === "en"
          ? `Details filled from the image${pct ? ` · Approximate confidence ${pct}%` : ""}. Review them before saving.`
          : result.notes ||
            `تم ملء البيانات من الصورة${pct ? ` · ثقة تقريبية ${pct}%` : ""}. راجعها قبل الحفظ.`,
      );
    } catch (err) {
      setEditIndex(targetIndex);
      const raw = err instanceof Error ? err.message : "";
      setScanHint(
        locale === "en" && /[\u0600-\u06FF]/.test(raw)
          ? "Passport scan failed"
          : raw || (locale === "en" ? "Passport scan failed" : "فشل مسح الجواز"),
      );
    } finally {
      setScanning(false);
      ignoreBackdropCloseRef.current = false;
      if (passportInputRef.current) passportInputRef.current.value = "";
    }
  }

  return (
    <div className="shop-flight-checkout">
      <ShopMockBanner compact />
      <div
        className="shop-flight-checkout-steps"
        aria-label={locale === "en" ? "Booking steps" : "خطوات الحجز"}
      >
        {(locale === "en"
          ? ["Your details", "Fare type", "Extras", "Seat selection", "Review and payment"]
          : ["بياناتك", "نوع التذكرة", "إضافات", "اختيار المقعد", "المراجعة والدفع"]
        ).map((label, idx) => (
          <span
            key={label}
            className={`shop-flight-checkout-step${idx === 0 ? " on" : ""}`}
          >
            <i>{idx + 1}</i>
            {label}
          </span>
        ))}
      </div>

      <div className="shop-flight-checkout-summary">
        <p>
          {tripLabel} · {pax} {locale === "en" ? (pax === 1 ? "traveler" : "travelers") : "مسافر"} · {dateLabel}
        </p>
        <h1>
          {locale === "en"
            ? airportPlaceLabel(draft.origin, "en")
            : draft.originLabel || draft.origin}{" "}
          {locale === "en" ? "to" : "إلى"}{" "}
          {locale === "en"
            ? airportPlaceLabel(draft.destination, "en")
            : draft.destinationLabel || draft.destination}
        </h1>
      </div>

      {error ? <p className="shop-error">{error}</p> : null}

      <div className="shop-flight-checkout-layout">
        <div className="shop-flight-checkout-main">
          <section className="shop-flight-checkout-card">
            <h2>{locale === "en" ? "Enter your details" : "أدخل بياناتك"}</h2>
            {travelers.map((traveler, idx) => {
              const done = travelerComplete(traveler);
              return (
                <div key={idx} className="shop-traveler-row">
                  <div className="shop-traveler-meta">
                    <i>👤</i>
                    <div>
                      <strong>
                        {idx < draft.adults
                          ? `${locale === "en" ? "Adult" : "بالغ"} ${idx + 1}`
                          : `${locale === "en" ? "Child" : "طفل"} ${
                              idx - draft.adults + 1
                            }`}
                      </strong>
                      {done ? (
                        <p className="shop-hint" style={{ margin: 0 }}>
                          {titleLabel(traveler.title, traveler.gender)}{" "}
                          {traveler.firstName} {traveler.lastName}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`shop-traveler-add${done ? " filled" : ""}`}
                    onClick={() => setEditIndex(idx)}
                  >
                    {done
                      ? locale === "en"
                        ? "Edit traveler details"
                        : "تعديل بيانات المسافر"
                      : locale === "en"
                        ? "Add traveler details"
                        : "أضف بيانات هذا المسافر"}
                  </button>
                </div>
              );
            })}

            <div className="shop-flight-baggage-block">
              <strong>{locale === "en" ? "On every flight" : "في كل رحلة"}</strong>
              <div className="shop-flight-baggage-row">
                <span>{locale === "en" ? "Personal item" : "حقيبة شخصية"}</span>
                <em>{baggage.personal || (locale === "en" ? "Included" : "مشمولة")}</em>
              </div>
              <div className="shop-flight-baggage-row">
                <span>{locale === "en" ? "Cabin bag" : "حقيبة مقصورة"}</span>
                <em>{baggage.cabin || (locale === "en" ? "Included" : "مشمولة")}</em>
              </div>
              {baggage.checked ? (
                <div className="shop-flight-baggage-row">
                  <span>{locale === "en" ? "Checked bag" : "حقيبة مسجّلة"}</span>
                  <em>{baggage.checked}</em>
                </div>
              ) : null}
            </div>
          </section>

          <section className="shop-flight-checkout-card">
            <h2>{locale === "en" ? "Contact details" : "بيانات التواصل"}</h2>
            <div className="shop-flight-contact-grid">
              <label>
                {locale === "en" ? "Contact name" : "الاسم للتواصل"}
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                {locale === "en" ? "Email address" : "البريد الإلكتروني"}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <small>
                  {locale === "en"
                    ? "We will send the flight confirmation to this email"
                    : "سنرسل تأكيد الرحلة إلى هذا البريد"}
                </small>
              </label>
              <label>
                {locale === "en" ? "Mobile number" : "رقم الجوال"}{" "}
                <small>{locale === "en" ? "(optional)" : "(اختياري)"}</small>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+965"
                />
              </label>
            </div>
          </section>

          <div className="shop-flight-checkout-nav">
            <Link href="/">‹ {locale === "en" ? "Back" : "رجوع"}</Link>
            <button type="button" disabled={submitting} onClick={onSubmit}>
              {submitting
                ? locale === "en"
                  ? "Saving…"
                  : "جارٍ الحفظ..."
                : locale === "en"
                  ? "Next"
                  : "التالي"}
            </button>
          </div>
        </div>

        <aside className="shop-flight-price-card">
          <h3>{locale === "en" ? "Price details" : "تفاصيل السعر"}</h3>
          <div className="shop-flight-price-line">
            <span>
              {locale === "en" ? "Flight · Adult" : "رحلة · بالغ"} ({draft.adults})
            </span>
            <span>
              {formatMoneyMinor(draft.flight.sellAmountMinor, draft.flight.currency)}
            </span>
          </div>
          <div className="shop-flight-price-total">
            <span>{locale === "en" ? "Total" : "الإجمالي"}</span>
            <span>
              {formatMoneyMinor(draft.flight.sellAmountMinor, draft.flight.currency)}
            </span>
          </div>
          <p className="shop-hint" style={{ margin: 0 }}>
            {locale === "en" ? "Includes taxes and fees" : "يشمل الضرائب والرسوم"}
          </p>
          <p className="shop-flight-price-note">
            ✓{" "}
            {locale === "en"
              ? "No hidden fees — follow the price at every step"
              : "لا رسوم خفية — تابع السعر في كل خطوة"}
          </p>
        </aside>
      </div>

      <input
        ref={passportInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="shop-passport-file-input"
        onChange={(e) => void onPassportSelected(e.target.files?.[0])}
      />

      {editing && editIndex != null ? (
        <div
          className="shop-traveler-modal-backdrop"
          onClick={closeTravelerModal}
          role="presentation"
        >
          <div
            className="shop-traveler-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shop-traveler-modal-head">
              <div className="shop-traveler-modal-title">
                <h3>
                  {locale === "en" ? "Traveler" : "المسافر"} {editIndex + 1}:{" "}
                  {editIndex < draft.adults
                    ? locale === "en"
                      ? "Adult"
                      : "بالغ"
                    : locale === "en"
                      ? "Child"
                      : "طفل"}
                </h3>
                <span>* {locale === "en" ? "Required" : "مطلوب"}</span>
              </div>
              <button
                type="button"
                className="shop-flight-modal-close"
                aria-label={locale === "en" ? "Close" : "إغلاق"}
                onClick={() => setEditIndex(null)}
              >
                ×
              </button>
            </div>

            <div className="shop-passport-scan-banner">
              <div>
                <strong>
                  {locale === "en"
                    ? "Scan passport from an image"
                    : "مسح جواز السفر بالصورة"}
                </strong>
                <p>
                  {locale === "en"
                    ? "Upload a clear passport photo page to fill the name, date of birth, nationality, and passport details automatically."
                    : "ارفع صورة واضحة لصفحة الجواز لملء الاسم وتاريخ الميلاد والجنسية وبيانات الجواز تلقائيًا."}
                </p>
              </div>
              <button
                type="button"
                className="shop-passport-scan-btn"
                onClick={openPassportPicker}
                disabled={scanning}
              >
                {scanning
                  ? locale === "en"
                    ? "Analyzing…"
                    : "جارٍ التحليل..."
                  : locale === "en"
                    ? "Upload passport image"
                    : "رفع صورة الجواز"}
              </button>
            </div>
            {scanHint ? <p className="shop-passport-scan-hint">{scanHint}</p> : null}
            <FamilyTravelerPicker
              mode="single"
              onPick={(member) => {
                const gender =
                  member.title === "ms" || member.title === "mrs" ? "female" : "male";
                const birth = member.birthDate ? String(member.birthDate).slice(0, 10) : "";
                const expiry = member.passportExpiry
                  ? String(member.passportExpiry).slice(0, 10)
                  : "";
                updateEditing({
                  title: member.title === "ms" ? "mrs" : member.title || "mr",
                  firstName: member.firstName,
                  lastName: member.lastName,
                  birthDate: birth,
                  nationality: member.nationality || "KW",
                  passportNumber: member.passportNumber || "",
                  passportExpiry: expiry,
                  gender,
                });
                if (birth) setDobDraft(splitBirthDate(birth));
                if (expiry) setExpiryDraft(splitBirthDate(expiry));
              }}
            />


            <label>
              {locale === "en" ? "Email address" : "البريد الإلكتروني"}*
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </label>

            <p className="shop-traveler-field-hint shop-traveler-id-hint">
              *{" "}
              {locale === "en"
                ? "The name must match the official identity document exactly"
                : "يجب أن يطابق الاسم وثيقة الهوية الرسمية حرفًا بحرف"}
            </p>

            <fieldset className="shop-traveler-title-field">
              <legend>{locale === "en" ? "Title" : "اللقب"}*</legend>
              <div
                className="shop-traveler-title-seg"
                role="radiogroup"
                aria-label={locale === "en" ? "Title" : "اللقب"}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={editing.title === "mr" || editing.gender === "male"}
                  className={
                    editing.title === "mr" || editing.gender === "male" ? "on" : ""
                  }
                  onClick={() => updateEditing({ title: "mr", gender: "male" })}
                >
                  Mr
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={
                    editing.title === "mrs" ||
                    editing.title === "ms" ||
                    editing.gender === "female"
                  }
                  className={
                    editing.title === "mrs" ||
                    editing.title === "ms" ||
                    editing.gender === "female"
                      ? "on"
                      : ""
                  }
                  onClick={() => updateEditing({ title: "mrs", gender: "female" })}
                >
                  Mrs
                </button>
              </div>
            </fieldset>

            <div className="shop-traveler-name-row shop-traveler-name-triple">
              <label>
                {locale === "en" ? "First name" : "الاسم الأول"}*
                <input
                  value={editing.firstName}
                  onChange={(e) => updateEditing({ firstName: e.target.value })}
                  placeholder={locale === "en" ? "As shown in passport" : "كما في الجواز"}
                  autoComplete="given-name"
                />
              </label>
              <label>
                {locale === "en" ? "Middle name" : "الاسم الأوسط"}
                <input
                  value={editing.middleName}
                  onChange={(e) => updateEditing({ middleName: e.target.value })}
                  placeholder={locale === "en" ? "Optional" : "اختياري"}
                  autoComplete="additional-name"
                />
              </label>
              <label>
                {locale === "en" ? "Last name" : "اسم العائلة"}*
                <input
                  value={editing.lastName}
                  onChange={(e) => updateEditing({ lastName: e.target.value })}
                  placeholder={locale === "en" ? "As shown in passport" : "كما في الجواز"}
                  autoComplete="family-name"
                />
              </label>
            </div>

            <div className="shop-traveler-vital-row">
              <label className="shop-traveler-dob-field">
                {locale === "en" ? "Date of birth" : "تاريخ الميلاد"}*
                <DatePartsRow
                  value={dobDraft}
                  onChange={(part) => updateDatePart("dob", part)}
                  labels={
                    locale === "en"
                      ? { month: "Month*", day: "Day*", year: "Year*" }
                      : { month: "الشهر*", day: "اليوم*", year: "السنة*" }
                  }
                  locale={locale}
                />
              </label>
              <fieldset className="shop-traveler-title-field shop-traveler-gender-field">
                <legend>{locale === "en" ? "Gender" : "الجنس"}*</legend>
                <div
                  className="shop-traveler-title-seg"
                  role="radiogroup"
                  aria-label={locale === "en" ? "Gender" : "الجنس"}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={editing.gender === "male"}
                    className={editing.gender === "male" ? "on" : ""}
                    onClick={() => updateEditing({ gender: "male", title: "mr" })}
                  >
                    {locale === "en" ? "Male" : "ذكر"}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={editing.gender === "female"}
                    className={editing.gender === "female" ? "on" : ""}
                    onClick={() =>
                      updateEditing({ gender: "female", title: "mrs" })
                    }
                  >
                    {locale === "en" ? "Female" : "أنثى"}
                  </button>
                </div>
              </fieldset>
            </div>

            <div className="shop-traveler-section">
              <h4 className="shop-traveler-section-title">
                {locale === "en" ? "Passport details" : "بيانات الجواز"}
              </h4>
              <div className="shop-traveler-passport-row">
                <label>
                  {locale === "en" ? "Passport number" : "رقم الجواز"}*
                  <input
                    value={editing.passportNumber}
                    onChange={(e) =>
                      updateEditing({
                        passportNumber: e.target.value
                          .replace(/\s+/g, "")
                          .toUpperCase(),
                      })
                    }
                    placeholder={locale === "en" ? "As shown in passport" : "كما في الجواز"}
                    autoCapitalize="characters"
                  />
                </label>
                <label>
                  {locale === "en" ? "Issuing country" : "دولة الإصدار"}*
                  <select
                    value={
                      PASSPORT_COUNTRIES.some((c) => c.code === editing.nationality)
                        ? editing.nationality
                        : "OTHER"
                    }
                    onChange={(e) =>
                      updateEditing({
                        nationality:
                          e.target.value === "OTHER" ? "" : e.target.value,
                      })
                    }
                  >
                    {PASSPORT_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c[locale]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {!PASSPORT_COUNTRIES.some((c) => c.code === editing.nationality) ||
              editing.nationality === "" ? (
                <label>
                  {locale === "en" ? "Country code (ISO)" : "رمز الدولة (ISO)"}
                  <input
                    value={editing.nationality}
                    onChange={(e) =>
                      updateEditing({
                        nationality: e.target.value
                          .replace(/[^a-zA-Z]/g, "")
                          .toUpperCase()
                          .slice(0, 3),
                      })
                    }
                    placeholder={locale === "en" ? "Example: KW" : "مثال: KW"}
                    maxLength={3}
                  />
                </label>
              ) : null}
              <label className="shop-traveler-dob-field">
                {locale === "en" ? "Issue date" : "تاريخ الإصدار"}*
                <DatePartsRow
                  value={issueDraft}
                  onChange={(part) => updateDatePart("issue", part)}
                  labels={
                    locale === "en"
                      ? { month: "Month*", day: "Day*", year: "Year*" }
                      : { month: "الشهر*", day: "اليوم*", year: "السنة*" }
                  }
                  locale={locale}
                />
              </label>
              <label className="shop-traveler-dob-field">
                {locale === "en" ? "Expiry date" : "تاريخ الانتهاء"}*
                <DatePartsRow
                  value={expiryDraft}
                  onChange={(part) => updateDatePart("expiry", part)}
                  labels={
                    locale === "en"
                      ? { month: "Month*", day: "Day*", year: "Year*" }
                      : { month: "الشهر*", day: "اليوم*", year: "السنة*" }
                  }
                  locale={locale}
                />
              </label>
            </div>

            <div className="shop-traveler-optional">
              <button
                type="button"
                className="shop-traveler-optional-toggle"
                aria-expanded={showOptional}
                onClick={() => setShowOptional((v) => !v)}
              >
                <span>
                  {locale === "en"
                    ? "Loyalty programs and optional requests"
                    : "برامج الولاء والطلبات الاختيارية"}
                </span>
                <i aria-hidden="true">{showOptional ? "▾" : "◂"}</i>
              </button>
              {showOptional ? (
                <p className="shop-traveler-field-hint" style={{ marginTop: "0.5rem" }}>
                  {locale === "en"
                    ? "Frequent-flyer numbers and special requests can be added later when supported by the ticket provider."
                    : "يمكن إضافة رقم المسافر الدائم والطلبات الخاصة في خطوة لاحقة عند توفرها من مزوّد التذاكر."}
                </p>
              ) : null}
            </div>

            <div className="shop-traveler-modal-foot">
              <button type="button" onClick={() => setEditIndex(null)}>
                {locale === "en" ? "Done" : "تم"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PublicBookPageContent() {
  const router = useRouter();
  const { locale } = useShopCopy();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [roomGuests, setRoomGuests] = useState<HotelRoomGuestDraft[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+965");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [needsUnlockCode, setNeedsUnlockCode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored) {
      router.replace("/");
      return;
    }
    setDraft(stored);
    const session = getShopSession();
    if (!session) {
      // Guest checkout: show booking form without forcing phone unlock
      setNeedLogin(false);
      if (stored.serviceType === "hotel") {
        setName(stored.contactName || "");
        setEmail(stored.contactEmail || "");
        setPhone(stored.contactPhone || "");
      }
      const count =
        stored.serviceType === "activity"
          ? Math.max(1, stored.adults)
          : Math.max(1, stored.adults + stored.children);
      setTravelers(Array.from({ length: count }, emptyTraveler));
      if (stored.serviceType === "hotel") {
        setSpecialRequests(stored.specialRequests || "");
        setPaymentMethod(stored.paymentMethod || null);
        setRoomGuests(buildHotelRoomGuests(stored));
      }
      return;
    }
    setName(
      stored.serviceType === "hotel" && stored.contactName
        ? stored.contactName
        : session.customer.name || "",
    );
    setEmail(
      stored.serviceType === "hotel" && stored.contactEmail
        ? stored.contactEmail
        : session.customer.email || "",
    );
    setPhone(
      stored.serviceType === "hotel" && stored.contactPhone
        ? stored.contactPhone
        : session.customer.phone,
    );
    const count =
      stored.serviceType === "activity"
        ? Math.max(1, stored.adults)
        : Math.max(1, stored.adults + stored.children);
    setTravelers(Array.from({ length: count }, emptyTraveler));
    if (stored.serviceType === "hotel") {
      setSpecialRequests(stored.specialRequests || "");
      setPaymentMethod(stored.paymentMethod || null);
      setRoomGuests(buildHotelRoomGuests(stored));
      if (stored.travelers?.length) {
        setTravelers(
          stored.travelers.map((t) => ({
            ...emptyTraveler(),
            firstName: t.firstName,
            lastName: t.lastName,
          })),
        );
      }
    }
    shopFetch<{
      travelers: Array<{
        id: string;
        title: string;
        firstName: string;
        middleName?: string | null;
        lastName: string;
        birthDate?: string | null;
        nationality?: string | null;
        passportNumber?: string | null;
        passportIssueDate?: string | null;
        passportExpiry?: string | null;
      }>;
    }>("/shop/me")
      .then((me) => {
        if (!me.travelers?.length) return;
        const selectedIds = loadFamilySelection();
        const ordered = selectedIds.length
          ? selectedIds
              .map((id) => me.travelers.find((row) => row.id === id))
              .filter((row): row is (typeof me.travelers)[number] => Boolean(row))
          : me.travelers;
        setTravelers((prev) =>
          prev.map((row, idx) => {
            const saved = ordered[idx];
            if (!saved) return row;
            const gender =
              saved.title === "ms" || saved.title === "mrs" ? "female" : "male";
            return {
              ...emptyTraveler(),
              ...row,
              title: saved.title === "ms" ? "mrs" : saved.title || "mr",
              firstName: saved.firstName || row.firstName,
              middleName: saved.middleName || row.middleName || "",
              lastName: saved.lastName || row.lastName,
              birthDate: saved.birthDate?.slice(0, 10) || row.birthDate,
              nationality: saved.nationality || row.nationality || "KW",
              passportNumber: saved.passportNumber || row.passportNumber || "",
              passportIssueDate:
                saved.passportIssueDate?.slice(0, 10) || row.passportIssueDate || "",
              passportExpiry:
                saved.passportExpiry?.slice(0, 10) || row.passportExpiry || "",
              gender,
            };
          }),
        );
      })
      .catch(() => undefined);
  }, [router]);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (needsUnlockCode) {
        const result = await verifyShopUnlock({
          phone,
          name,
          email,
          code: unlockCode,
        });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        setNeedLogin(false);
        setNeedsUnlockCode(false);
        setPhone(result.customer.phone);
        return;
      }
      const result = await unlockShopCustomer({ phone, name, email });
      if (result.needsCode) {
        setNeedsUnlockCode(true);
        if (result.debugCode) setUnlockCode(result.debugCode);
        return;
      }
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      setNeedLogin(false);
      setPhone(result.customer.phone);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        locale === "en" && /[\u0600-\u06FF]/.test(raw)
          ? "Could not sign in"
          : raw || (locale === "en" ? "Could not sign in" : "تعذر تسجيل الدخول"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submit() {
    if (!draft) return;
    if (draft.serviceType === "hotel") {
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
      if (Object.keys(errors).length) {
        setError(
          locale === "en"
            ? "Complete the required fields in the guest form"
            : "أكمل الحقول المطلوبة في نموذج الضيوف",
        );
        return;
      }
    } else if (!name.trim()) {
      setError(locale === "en" ? "Enter a contact name" : "أدخل الاسم للتواصل");
      return;
    }
    if (draft.serviceType === "flight") {
      const incomplete = travelers.some((t) => !travelerComplete(t));
      if (incomplete) {
        setError(
          locale === "en"
            ? "Complete all traveler details before continuing"
            : "أكمل بيانات جميع المسافرين قبل المتابعة",
        );
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      if (!getShopSession()) {
        const guestResult = await unlockShopCustomer({
          phone: phone.trim() || undefined,
          name: name.trim(),
          email: email.trim() || undefined,
          guest: !phone.trim(),
        });
        if (guestResult.needsCode) {
          setNeedLogin(true);
          setNeedsUnlockCode(true);
          if (guestResult.debugCode) setUnlockCode(guestResult.debugCode);
          setError(
            locale === "en"
              ? "Enter the verification code to continue, or leave the mobile number empty to continue as a guest"
              : "أدخل رمز التحقق للمتابعة، أو اترك الجوال فارغاً للمتابعة كضيف",
          );
          setSubmitting(false);
          return;
        }
        saveShopSession({
          accessToken: guestResult.accessToken,
          customer: guestResult.customer,
        });
      }
      const payload =
        draft.serviceType === "flight"
          ? {
              serviceType: "flight" as const,
              inquiryId: draft.inquiryId,
              quoteItemId: draft.quoteItemId,
              offer: {
                id: draft.flight.id,
                description: draft.flight.description,
                sellAmountMinor: draft.flight.sellAmountMinor,
                currency: draft.flight.currency,
                details: draft.flight.details,
                providerOfferRef: draft.flight.id,
              },
              route: {
                origin: draft.origin,
                destination: draft.destination,
                originLabel: draft.originLabel,
                destinationLabel: draft.destinationLabel,
                departDate: draft.departDate,
                returnDate: draft.returnDate,
                tripType: draft.tripType,
                cabinClass: draft.cabinClass,
              },
              travelers,
              adults: draft.adults,
              children: draft.children,
            }
          : draft.serviceType === "hotel"
            ? {
                serviceType: "hotel" as const,
                inquiryId: draft.inquiryId,
                quoteItemId: draft.quoteItemId,
                offer: {
                  id: draft.hotel.id,
                  description: draft.hotel.description,
                  sellAmountMinor: draft.hotel.sellAmountMinor,
                  currency: draft.hotel.currency,
                  details: draft.hotel.details,
                  providerOfferRef: draft.hotel.id,
                },
                stay: {
                  location: draft.location,
                  locationLabel: draft.locationLabel,
                  checkIn: draft.checkIn,
                  checkOut: draft.checkOut,
                  rooms: draft.rooms,
                },
                guests: roomGuests.map((g) => ({
                  title: g.title,
                  firstName: g.firstName,
                  lastName: g.lastName,
                  firstNameEn: g.firstNameEn,
                  lastNameEn: g.lastNameEn,
                  type: g.type,
                  age: g.age,
                  roomIndex: g.roomIndex,
                  isLead: g.isLead,
                })),
                adults: draft.adults,
                children: draft.children,
              }
            : draft.serviceType === "transfer"
              ? {
                  serviceType: "transfer" as const,
                  offer: {
                    id: draft.transfer.id,
                    description: draft.transfer.description,
                    sellAmountMinor: draft.transfer.sellAmountMinor,
                    currency: draft.transfer.currency,
                    details: draft.transfer.details,
                    providerOfferRef: draft.transfer.id,
                  },
                  route: {
                    origin: draft.from,
                    destination: draft.to,
                    departDate: draft.outboundDate,
                    returnDate: draft.inboundDate,
                  },
                  travelers,
                  adults: draft.adults,
                  children: draft.children,
                }
              : {
                  serviceType: "activity" as const,
                  inquiryId: draft.inquiryId,
                  offer: {
                    id: draft.activity.id,
                    description: draft.activity.description,
                    sellAmountMinor: draft.activity.sellAmountMinor,
                    currency: draft.activity.currency,
                    details: draft.activity.details,
                    providerOfferRef: draft.activity.id,
                  },
                  route: {
                    origin: draft.destination,
                    destination: draft.destination,
                    originLabel: draft.destinationLabel,
                    destinationLabel: draft.destinationLabel,
                    departDate: draft.fromDate,
                    returnDate: draft.toDate,
                  },
                  adults: draft.adults,
                  children: draft.children,
                };
      const result = await shopFetch<{ booking: { id: string } }>("/shop/book", {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          contact: {
            email,
            phone:
              draft.serviceType === "hotel"
                ? `${phoneCountry}${phone.replace(/\D/g, "")}`
                : phone,
          },
          extras: {
            guestName: name,
            specialRequests: specialRequests || undefined,
            paymentMethod: paymentMethod || undefined,
            ...(draft.serviceType === "hotel"
              ? {
                  phoneCountry,
                  roomGuests,
                  selectedRate: (draft as HotelBookingDraft).selectedRate,
                  priceBreakdown: (draft as HotelBookingDraft).priceBreakdown,
                }
              : {}),
          },
        }),
      });
      clearBookingDraft();
      setBookingId(result.booking.id);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      setError(
        locale === "en" && /[\u0600-\u06FF]/.test(raw)
          ? "Could not save the booking request"
          : raw || (locale === "en" ? "Could not save the booking request" : "تعذر حفظ الطلب"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const isFlight = draft?.serviceType === "flight";
  const isHotel = draft?.serviceType === "hotel";

  if (!draft) return null;

  return (
    <>
      {bookingId ? (
        <section className="shop-panel">
          <ShopMockBanner compact />
          <h1>{locale === "en" ? "Your request was saved" : "تم حفظ طلبك"}</h1>
          <p>{locale === "en" ? "Request number" : "رقم الطلب"}: {bookingId}</p>
          <p className="shop-hint">
            {locale === "en"
              ? "This is a test stage — no amount was charged. The WeekendGate team will contact you to confirm the request when live booking is enabled."
              : "هذه مرحلة اختبار — لم يُخصم أي مبلغ. سيتواصل فريق WeekendGate لتأكيد الطلب عند تفعيل الحجز الحقيقي."}
          </p>
          <Link className="shop-btn" href="/account">
            {locale === "en" ? "View my trips" : "عرض رحلاتي"}
          </Link>
        </section>
      ) : needLogin ? (
        <section className="shop-panel">
          <ShopMockBanner compact />
          <h1>{locale === "en" ? "Complete request" : "إتمام الطلب"}</h1>
          <p>{draftTitle(draft)}</p>
          {error ? <p className="shop-error">{error}</p> : null}
          <form className="shop-form" onSubmit={unlock}>
            <p>
              {locale === "en"
                ? "Enter your mobile number to save the request to your account."
                : "أدخل جوالك لحفظ الطلب على حسابك."}
            </p>
            <label>
              {locale === "en" ? "Name" : "الاسم"}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {locale === "en" ? "Mobile" : "الجوال"}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={needsUnlockCode}
              />
            </label>
            <label>
              {locale === "en" ? "Email" : "البريد"}
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {needsUnlockCode ? (
              <label>
                {locale === "en" ? "Verification code" : "رمز التحقق"}
                <input
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder={locale === "en" ? "6 digits" : "6 أرقام"}
                />
              </label>
            ) : null}
            <button className="shop-btn" type="submit" disabled={submitting}>
              {submitting
                ? "..."
                : needsUnlockCode
                  ? locale === "en"
                    ? "Confirm code"
                    : "تأكيد الرمز"
                  : locale === "en"
                    ? "Continue"
                    : "متابعة"}
            </button>
          </form>
        </section>
      ) : isFlight ? (
        <FlightCheckout
          draft={draft}
          travelers={travelers}
          setTravelers={setTravelers}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          name={name}
          setName={setName}
          error={error}
          submitting={submitting}
          onSubmit={() => void submit()}
        />
      ) : isHotel ? (
        <HotelCheckout
          draft={draft as HotelBookingDraft}
          roomGuests={roomGuests}
          setRoomGuests={setRoomGuests}
          email={email}
          setEmail={setEmail}
          emailConfirm={emailConfirm}
          setEmailConfirm={setEmailConfirm}
          phone={phone}
          setPhone={setPhone}
          phoneCountry={phoneCountry}
          setPhoneCountry={setPhoneCountry}
          name={name}
          setName={setName}
          specialRequests={specialRequests}
          setSpecialRequests={setSpecialRequests}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          termsAccepted={termsAccepted}
          setTermsAccepted={setTermsAccepted}
          error={error}
          submitting={submitting}
          onSubmit={() => void submit()}
        />
      ) : (
        <section className="shop-panel">
          <ShopMockBanner compact />
          <h1>{locale === "en" ? "Complete request" : "إتمام الطلب"}</h1>
          <p>{draftTitle(draft)}</p>
          <p>
            <strong>{formatMoneyMinor(draftPrice(draft), draftCurrency(draft))}</strong>
          </p>
          {error ? <p className="shop-error">{error}</p> : null}
          <div className="shop-form">
            <label>
              {locale === "en" ? "Contact name" : "الاسم للتواصل"}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {locale === "en" ? "Mobile" : "الجوال"}
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              {locale === "en" ? "Email" : "البريد"}
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button
              type="button"
              className="shop-btn shop-btn-checkout"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting
                ? locale === "en"
                  ? "Saving…"
                  : "جارٍ الحفظ..."
                : locale === "en"
                  ? "Complete booking"
                  : "إتمام الحجز"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export default function PublicBookPage() {
  return (
    <StoreFront>
      <PublicBookPageContent />
    </StoreFront>
  );
}
