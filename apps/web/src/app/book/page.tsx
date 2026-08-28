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
import type { HotelBookingDraft, HotelRoomGuestDraft } from "@/lib/booking-draft";
import { compressPassportImage } from "@/lib/compress-passport-image";

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
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  gender: string;
};

function emptyTraveler(): Traveler {
  return {
    title: "mr",
    firstName: "",
    lastName: "",
    birthDate: "",
    nationality: "KW",
    passportNumber: "",
    passportExpiry: "",
    gender: "",
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
      t.passportNumber.trim() &&
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
  { v: "01", l: "يناير" },
  { v: "02", l: "فبراير" },
  { v: "03", l: "مارس" },
  { v: "04", l: "أبريل" },
  { v: "05", l: "مايو" },
  { v: "06", l: "يونيو" },
  { v: "07", l: "يوليو" },
  { v: "08", l: "أغسطس" },
  { v: "09", l: "سبتمبر" },
  { v: "10", l: "أكتوبر" },
  { v: "11", l: "نوفمبر" },
  { v: "12", l: "ديسمبر" },
];

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
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [dobDraft, setDobDraft] = useState({ y: "", m: "", d: "" });
  const [scanning, setScanning] = useState(false);
  const [scanHint, setScanHint] = useState("");
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const scanTargetRef = useRef<number>(0);
  const ignoreBackdropCloseRef = useRef(false);
  const baggage = (draft.flight.details.baggage || {}) as Record<string, string>;
  const tripLabel =
    draft.tripType === "roundtrip"
      ? "ذهاب وعودة"
      : draft.tripType === "multicity"
        ? "وجهات متعددة"
        : "اتجاه واحد";
  const pax = draft.adults + draft.children;
  const dateLabel = [
    formatDay(draft.departDate),
    draft.returnDate ? formatDay(draft.returnDate) : "",
  ]
    .filter(Boolean)
    .join(" – ");

  const editing = editIndex != null ? travelers[editIndex] : null;

  useEffect(() => {
    if (editIndex == null) return;
    setDobDraft(splitBirthDate(travelers[editIndex]?.birthDate || ""));
    setScanHint("");
  }, [editIndex]);

  function updateEditing(patch: Partial<Traveler>) {
    if (editIndex == null) return;
    setTravelers((rows) =>
      rows.map((row, i) => (i === editIndex ? { ...row, ...patch } : row)),
    );
  }

  function updateDobPart(part: Partial<{ y: string; m: string; d: string }>) {
    const next = { ...dobDraft, ...part };
    setDobDraft(next);
    updateEditing({ birthDate: joinBirthDate(next.y, next.m, next.d) });
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
      setScanHint("اختر صورة جواز سفر (JPG أو PNG)");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setEditIndex(targetIndex);
      setScanHint("حجم الصورة كبير. استخدم صورة أصغر من 6MB");
      return;
    }

    // Keep modal open while scanning (file dialog may have closed it).
    setEditIndex(targetIndex);
    setScanning(true);
    setScanHint("جارٍ ضغط الصورة...");
    try {
      const { base64: imageBase64, mimeType } = await compressPassportImage(file);
      setScanHint("جارٍ تحليل صورة الجواز...");
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
          result.notes ||
            "تعذر قراءة بيانات كافية من الصورة. جرّب صورة أوضح لصفحة الجواز (الوجه الأمامي مع السطر السفلي).",
        );
        return;
      }
      const gender =
        titleToGender(f.title) ||
        travelers[targetIndex]?.gender ||
        "";
      const title = gender
        ? genderToTitle(gender)
        : f.title === "mrs" || f.title === "ms"
          ? "mrs"
          : f.title === "mr"
            ? "mr"
            : travelers[targetIndex]?.title || "mr";
      setTravelers((rows) =>
        rows.map((row, i) =>
          i === targetIndex
            ? {
                ...row,
                ...(f.firstName ? { firstName: String(f.firstName).trim() } : {}),
                ...(f.lastName ? { lastName: String(f.lastName).trim() } : {}),
                ...(f.birthDate ? { birthDate: String(f.birthDate).slice(0, 10) } : {}),
                ...(f.nationality ? { nationality: String(f.nationality).toUpperCase() } : {}),
                ...(f.passportNumber
                  ? { passportNumber: String(f.passportNumber).replace(/\s+/g, "").toUpperCase() }
                  : {}),
                ...(f.passportExpiry
                  ? { passportExpiry: String(f.passportExpiry).slice(0, 10) }
                  : {}),
                ...(gender ? { gender, title } : f.title ? { title } : {}),
              }
            : row,
        ),
      );
      if (f.birthDate) setDobDraft(splitBirthDate(String(f.birthDate).slice(0, 10)));
      const pct = Math.round((result.confidence || 0) * 100);
      setScanHint(
        result.notes ||
          `تم ملء البيانات من الصورة${pct ? ` · ثقة تقريبية ${pct}%` : ""}. راجعها قبل الحفظ.`,
      );
    } catch (err) {
      setEditIndex(targetIndex);
      setScanHint(err instanceof Error ? err.message : "فشل مسح الجواز");
    } finally {
      setScanning(false);
      ignoreBackdropCloseRef.current = false;
      if (passportInputRef.current) passportInputRef.current.value = "";
    }
  }

  return (
    <div className="shop-flight-checkout">
      <ShopMockBanner compact />
      <div className="shop-flight-checkout-steps" aria-label="خطوات الحجز">
        {[
          "بياناتك",
          "نوع التذكرة",
          "إضافات",
          "اختيار المقعد",
          "المراجعة والدفع",
        ].map((label, idx) => (
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
          {tripLabel} · {pax} مسافر · {dateLabel}
        </p>
        <h1>
          {draft.originLabel || draft.origin} إلى{" "}
          {draft.destinationLabel || draft.destination}
        </h1>
      </div>

      {error ? <p className="shop-error">{error}</p> : null}

      <div className="shop-flight-checkout-layout">
        <div className="shop-flight-checkout-main">
          <section className="shop-flight-checkout-card">
            <h2>أدخل بياناتك</h2>
            {travelers.map((traveler, idx) => {
              const done = travelerComplete(traveler);
              return (
                <div key={idx} className="shop-traveler-row">
                  <div className="shop-traveler-meta">
                    <i>👤</i>
                    <div>
                      <strong>
                        {idx < draft.adults ? `بالغ ${idx + 1}` : `طفل ${idx - draft.adults + 1}`}
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
                    {done ? "تعديل بيانات المسافر" : "أضف بيانات هذا المسافر"}
                  </button>
                </div>
              );
            })}

            <div className="shop-flight-baggage-block">
              <strong>في كل رحلة</strong>
              <div className="shop-flight-baggage-row">
                <span>حقيبة شخصية</span>
                <em>{baggage.personal || "مشمولة"}</em>
              </div>
              <div className="shop-flight-baggage-row">
                <span>حقيبة مقصورة</span>
                <em>{baggage.cabin || "مشمولة"}</em>
              </div>
              {baggage.checked ? (
                <div className="shop-flight-baggage-row">
                  <span>حقيبة مسجّلة</span>
                  <em>{baggage.checked}</em>
                </div>
              ) : null}
            </div>
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
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <small>سنرسل تأكيد الرحلة إلى هذا البريد</small>
              </label>
              <label>
                رقم الجوال
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+965"
                />
              </label>
            </div>
          </section>

          <div className="shop-flight-checkout-nav">
            <Link href="/">‹ رجوع</Link>
            <button type="button" disabled={submitting} onClick={onSubmit}>
              {submitting ? "جارٍ الحفظ..." : "التالي"}
            </button>
          </div>
        </div>

        <aside className="shop-flight-price-card">
          <h3>تفاصيل السعر</h3>
          <div className="shop-flight-price-line">
            <span>
              رحلة · بالغ ({draft.adults})
            </span>
            <span>
              {formatMoneyMinor(draft.flight.sellAmountMinor, draft.flight.currency)}
            </span>
          </div>
          <div className="shop-flight-price-total">
            <span>الإجمالي</span>
            <span>
              {formatMoneyMinor(draft.flight.sellAmountMinor, draft.flight.currency)}
            </span>
          </div>
          <p className="shop-hint" style={{ margin: 0 }}>
            يشمل الضرائب والرسوم
          </p>
          <p className="shop-flight-price-note">✓ لا رسوم خفية — تابع السعر في كل خطوة</p>
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
              <strong>* مطلوب</strong>
              <button
                type="button"
                className="shop-flight-modal-close"
                aria-label="إغلاق"
                onClick={() => setEditIndex(null)}
              >
                ×
              </button>
            </div>

            <div className="shop-passport-scan-banner">
              <div>
                <strong>مسح جواز السفر بالصورة</strong>
                <p>
                  ارفع صورة واضحة لصفحة الجواز لملء الاسم وتاريخ الميلاد والجنسية
                  تلقائيًا.
                </p>
              </div>
              <button
                type="button"
                className="shop-passport-scan-btn"
                onClick={openPassportPicker}
                disabled={scanning}
              >
                {scanning ? "جارٍ التحليل..." : "رفع صورة الجواز"}
              </button>
            </div>
            {scanHint ? <p className="shop-passport-scan-hint">{scanHint}</p> : null}

            <label>
              نوع المسافر / اللقب
              <select
                value={editing.gender}
                onChange={(e) => {
                  const gender = e.target.value;
                  updateEditing({
                    gender,
                    title: genderToTitle(gender),
                  });
                }}
              >
                <option value="">اختر</option>
                <option value="male">ذكر · Mr</option>
                <option value="female">أنثى · Mrs</option>
              </select>
              <small>
                يظهر مع الاسم كـ{" "}
                {titleLabel(editing.title, editing.gender) || "Mr / Mrs"}
              </small>
            </label>
            <label>
              الاسم الأول
              <input
                value={editing.firstName}
                onChange={(e) => updateEditing({ firstName: e.target.value })}
              />
              <small>أدخل الاسم كما هو مكتوب في وثيقة السفر</small>
            </label>
            <label>
              اسم العائلة
              <input
                value={editing.lastName}
                onChange={(e) => updateEditing({ lastName: e.target.value })}
              />
              <small>أدخل الاسم كما هو مكتوب في وثيقة السفر</small>
            </label>
            <label>
              تاريخ الميلاد
              <div className="shop-traveler-dob">
                <select
                  value={dobDraft.m}
                  onChange={(e) => updateDobPart({ m: e.target.value })}
                >
                  <option value="">الشهر</option>
                  {MONTHS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {m.l}
                    </option>
                  ))}
                </select>
                <input
                  inputMode="numeric"
                  placeholder="يوم"
                  maxLength={2}
                  value={dobDraft.d}
                  onChange={(e) =>
                    updateDobPart({ d: e.target.value.replace(/\D/g, "") })
                  }
                />
                <input
                  inputMode="numeric"
                  placeholder="سنة"
                  maxLength={4}
                  value={dobDraft.y}
                  onChange={(e) =>
                    updateDobPart({ y: e.target.value.replace(/\D/g, "") })
                  }
                />
              </div>
            </label>
            <label>
              رقم الجواز
              <input
                value={editing.passportNumber}
                onChange={(e) =>
                  updateEditing({
                    passportNumber: e.target.value.replace(/\s+/g, "").toUpperCase(),
                  })
                }
                placeholder="كما في الجواز"
                autoCapitalize="characters"
              />
            </label>
            <label>
              تاريخ انتهاء الجواز
              <input
                type="date"
                value={editing.passportExpiry || ""}
                onChange={(e) => updateEditing({ passportExpiry: e.target.value })}
              />
            </label>
            <div className="shop-traveler-modal-foot">
              <button type="button" onClick={() => setEditIndex(null)}>
                تم
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PublicBookPage() {
  const router = useRouter();
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
      setNeedLogin(true);
      if (stored.serviceType === "hotel") {
        setName(stored.contactName || "");
        setEmail(stored.contactEmail || "");
        setPhone(stored.contactPhone || "");
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
        title: string;
        firstName: string;
        lastName: string;
        birthDate?: string | null;
        nationality?: string | null;
        passportNumber?: string | null;
        passportExpiry?: string | null;
      }>;
    }>("/shop/me")
      .then((me) => {
        if (!me.travelers?.length) return;
        setTravelers((prev) =>
          prev.map((row, idx) => {
            const saved = me.travelers[idx];
            if (!saved) return row;
            const gender =
              saved.title === "ms" || saved.title === "mrs" ? "female" : "male";
            return {
              title: saved.title === "ms" ? "mrs" : saved.title || "mr",
              firstName: saved.firstName,
              lastName: saved.lastName,
              birthDate: saved.birthDate?.slice(0, 10) || "",
              nationality: saved.nationality || "KW",
              passportNumber: saved.passportNumber || "",
              passportExpiry: saved.passportExpiry?.slice(0, 10) || "",
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
      const result = await shopFetch<{
        accessToken: string;
        customer: {
          id: string;
          phone: string;
          email: string | null;
          name: string | null;
          status: string;
        };
      }>("/shop/unlock", {
        method: "POST",
        body: JSON.stringify({ phone, name, email }),
      });
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      setNeedLogin(false);
      setPhone(result.customer.phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
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
        setError("أكمل الحقول المطلوبة في نموذج الضيوف");
        return;
      }
    } else if (!name.trim() || !phone.trim()) {
      setError("أدخل الاسم والجوال");
      return;
    }
    if (draft.serviceType === "flight") {
      const incomplete = travelers.some((t) => !travelerComplete(t));
      if (incomplete) {
        setError("أكمل بيانات جميع المسافرين قبل المتابعة");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
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
      setError(err instanceof Error ? err.message : "تعذر حفظ الطلب");
    } finally {
      setSubmitting(false);
    }
  }

  const isFlight = draft?.serviceType === "flight";
  const isHotel = draft?.serviceType === "hotel";

  if (!draft) return null;

  return (
    <StoreFront>
      {bookingId ? (
        <section className="shop-panel">
          <ShopMockBanner compact />
          <h1>تم حفظ طلبك</h1>
          <p>رقم الطلب: {bookingId}</p>
          <p className="shop-hint">
            هذه مرحلة اختبار — لم يُخصم أي مبلغ. سيتواصل فريق WeekendGate لتأكيد
            الطلب عند تفعيل الحجز الحقيقي.
          </p>
          <Link className="shop-btn" href="/account">
            عرض رحلاتي
          </Link>
        </section>
      ) : needLogin ? (
        <section className="shop-panel">
          <ShopMockBanner compact />
          <h1>إتمام الطلب</h1>
          <p>{draftTitle(draft)}</p>
          {error ? <p className="shop-error">{error}</p> : null}
          <form className="shop-form" onSubmit={unlock}>
            <p>أدخل جوالك لحفظ الطلب على حسابك.</p>
            <label>
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              الجوال
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            <label>
              البريد
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button className="shop-btn" type="submit" disabled={submitting}>
              {submitting ? "..." : "متابعة"}
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
          <h1>إتمام الطلب</h1>
          <p>{draftTitle(draft)}</p>
          <p>
            <strong>{formatMoneyMinor(draftPrice(draft), draftCurrency(draft))}</strong>
          </p>
          {error ? <p className="shop-error">{error}</p> : null}
          <div className="shop-form">
            <label>
              الاسم للتواصل
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              الجوال
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              البريد
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <button
              type="button"
              className="shop-btn shop-btn-checkout"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? "جارٍ الحفظ..." : "إتمام الحجز"}
            </button>
          </div>
        </section>
      )}
    </StoreFront>
  );
}
