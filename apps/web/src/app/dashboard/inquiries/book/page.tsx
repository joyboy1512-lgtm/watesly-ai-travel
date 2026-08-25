"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import {
  clearBookingDraft,
  getBookingDraft,
  type FlightBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";

const STEPS = [
  "بياناتك",
  "نوع التذكرة",
  "إضافات",
  "اختيار المقعد",
  "المراجعة والدفع",
] as const;

type PaymentMethod = "card" | "knet" | "transfer";

function emptyCard() {
  return { name: "", number: "", expiry: "", cvv: "" };
}

type Traveler = {
  title: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
};

const TITLE_LABELS: Record<string, string> = {
  mr: "السيد",
  mrs: "السيدة",
  ms: "الآنسة",
  child: "طفل",
};

function emptyTraveler(): Traveler {
  return {
    title: "mr",
    firstName: "",
    lastName: "",
    birthDate: "",
    nationality: "SA",
    passportNumber: "",
    passportExpiry: "",
  };
}

function formatTripDate(value?: string) {
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

export default function FlightBookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<FlightBookingDraft | null>(null);
  const [step, setStep] = useState(0);
  const [editingTraveler, setEditingTraveler] = useState<number | null>(0);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+965");
  const [phone, setPhone] = useState("");
  const [ticketType, setTicketType] = useState<"standard" | "flexible">(
    "standard",
  );
  const [extras, setExtras] = useState({
    insurance: false,
    priority: false,
  });
  const [seatPref, setSeatPref] = useState("any");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [card, setCard] = useState(emptyCard());
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [scanningIndex, setScanningIndex] = useState<number | null>(null);
  const [scanHint, setScanHint] = useState("");
  const passportInputRef = useRef<HTMLInputElement | null>(null);
  const scanTargetRef = useRef<number>(0);

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored) {
      router.replace("/dashboard/inquiries");
      return;
    }
    if (stored.serviceType === "hotel") {
      router.replace("/dashboard/inquiries/book/hotel");
      return;
    }
    if (stored.serviceType === "transfer") {
      router.replace("/dashboard/inquiries/book/transfer");
      return;
    }
    if (stored.serviceType === "activity") {
      router.replace("/dashboard/inquiries/book/activity");
      return;
    }
    setDraft(stored);
    const count = Math.max(1, stored.adults + stored.children);
    setTravelers(Array.from({ length: count }, () => emptyTraveler()));
    setEditingTraveler(0);
  }, [router]);

  const total = useMemo(() => {
    if (!draft) return 0;
    let amount = draft.flight.sellAmountMinor;
    if (ticketType === "flexible") amount += 8900;
    if (extras.insurance) amount += 4500;
    if (extras.priority) amount += 2500;
    return amount;
  }, [draft, ticketType, extras]);

  function updateTraveler(index: number, patch: Partial<Traveler>) {
    setTravelers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      reader.readAsDataURL(file);
    });
  }

  function openPassportPicker(index: number) {
    scanTargetRef.current = index;
    setScanHint("");
    setError("");
    setEditingTraveler(index);
    passportInputRef.current?.click();
  }

  async function onPassportSelected(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("اختر صورة جواز سفر (JPG أو PNG)");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("حجم الصورة كبير. استخدم صورة أصغر من 6MB");
      return;
    }

    const index = scanTargetRef.current;
    setScanningIndex(index);
    setError("");
    setScanHint("جارٍ تحليل صورة الجواز بالذكاء الاصطناعي...");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const comma = dataUrl.indexOf(",");
      const imageBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      const result = await apiFetch<{
        fields: Partial<Traveler>;
        confidence: number;
        notes?: string;
      }>("/travel-meta/passport-scan", {
        method: "POST",
        body: JSON.stringify({
          imageBase64,
          mimeType: file.type || "image/jpeg",
        }),
      });

      const f = result.fields || {};
      updateTraveler(index, {
        ...(f.title ? { title: f.title } : {}),
        ...(f.firstName ? { firstName: f.firstName } : {}),
        ...(f.lastName ? { lastName: f.lastName } : {}),
        ...(f.birthDate ? { birthDate: f.birthDate } : {}),
        ...(f.nationality ? { nationality: f.nationality } : {}),
        ...(f.passportNumber ? { passportNumber: f.passportNumber } : {}),
        ...(f.passportExpiry ? { passportExpiry: f.passportExpiry } : {}),
      });
      setEditingTraveler(index);
      const pct = Math.round((result.confidence || 0) * 100);
      setScanHint(
        `تم ملء البيانات من الصورة${pct ? ` · ثقة تقريبية ${pct}%` : ""}. راجعها قبل المتابعة.`,
      );
      setOk("");
    } catch (e) {
      setScanHint("");
      setError(e instanceof Error ? e.message : "فشل مسح الجواز");
    } finally {
      setScanningIndex(null);
      if (passportInputRef.current) passportInputRef.current.value = "";
    }
  }

  function travelerComplete(t: Traveler) {
    return Boolean(
      t.firstName.trim() &&
        t.lastName.trim() &&
        t.birthDate &&
        t.passportNumber.trim(),
    );
  }

  function validateStep() {
    if (step === 0) {
      if (!travelers.every(travelerComplete)) {
        setError("أكمل بيانات جميع المسافرين قبل المتابعة");
        return false;
      }
      if (!email.trim() || !phone.trim()) {
        setError("البريد الإلكتروني ورقم الجوال مطلوبان");
        return false;
      }
    }
    if (step === STEPS.length - 1) {
      if (!paymentMethod) {
        setError("اختر طريقة الدفع أولاً للمتابعة");
        return false;
      }
      if (paymentMethod === "card") {
        if (
          !card.name.trim() ||
          card.number.replace(/\s/g, "").length < 12 ||
          !card.expiry.trim() ||
          card.cvv.trim().length < 3
        ) {
          setError("أدخل بيانات البطاقة كاملة (الاسم، الرقم، الانتهاء، CVV)");
          return false;
        }
      }
    }
    setError("");
    return true;
  }

  async function submitBooking() {
    if (!draft || !paymentMethod) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch<{ booking: { id: string } }>(
        "/bookings/from-draft",
        {
          method: "POST",
          body: JSON.stringify({
            serviceType: "flight",
            inquiryId: draft.inquiryId,
            quoteItemId: draft.quoteItemId,
            offer: {
              id: draft.flight.id,
              description: draft.flight.description,
              sellAmountMinor: total,
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
            contact: { email, phone: `${phoneCode} ${phone}` },
            extras,
            ticketType,
            seatPref,
            payment: {
              method: paymentMethod,
              status: paymentMethod === "transfer" ? "pending" : "paid",
            },
          }),
        },
      );
      setBookingId(result.booking.id);
      clearBookingDraft();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تأكيد الحجز والدفع");
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!validateStep()) return;
    if (step >= STEPS.length - 1) {
      void submitBooking();
      return;
    }
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    setOk("");
    if (step === 0) {
      router.push("/dashboard/inquiries");
      return;
    }
    setStep((s) => s - 1);
  }

  if (!draft) {
    return (
      <AppShell title="إتمام الحجز">
        <p className="lead">جارٍ تحميل بيانات الرحلة...</p>
      </AppShell>
    );
  }

  if (bookingId) {
    return (
      <AppShell title="إتمام الحجز">
        <div className="book-success">
          <div className="book-success-icon">✓</div>
          <h2>تم تأكيد حجزك بنجاح</h2>
          <p>
            سيتم مراجعة الحجز وإصداره من فريقنا قريبًا. تم إرسال تفاصيل
            الرحلة إلى بريدك الإلكتروني.
          </p>
          <span className="book-success-id">رقم الحجز: {bookingId}</span>
          <div className="book-success-actions">
            <Link href="/dashboard/bookings" className="btn">
              عرض الحجوزات
            </Link>
            <Link href="/dashboard/inquiries" className="btn secondary">
              بحث جديد
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const airline = String(draft.flight.details.airline || "شركة طيران");
  const routeTitle = `${draft.origin} إلى ${draft.destination}`;

  return (
    <AppShell title="إتمام الحجز">
      <div className="book-page">
        <input
          ref={passportInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="passport-file-input"
          onChange={(e) => void onPassportSelected(e.target.files?.[0])}
        />
        <ol className="book-steps">
          {STEPS.map((label, idx) => (
            <li
              key={label}
              className={
                idx === step ? "active" : idx < step ? "done" : undefined
              }
            >
              <span>{idx + 1}</span>
              <em>{label}</em>
            </li>
          ))}
        </ol>

        <div className="book-route-head">
          <p>
            {draft.tripType === "roundtrip" ? "ذهاب وعودة" : "ذهاب فقط"} ·{" "}
            {draft.adults + draft.children} مسافر ·{" "}
            {formatTripDate(draft.departDate)}
            {draft.tripType === "roundtrip"
              ? ` — ${formatTripDate(draft.returnDate)}`
              : ""}
          </p>
          <h2>{routeTitle}</h2>
        </div>

        <div className="book-layout">
          <div className="book-main">
            {step === 0 ? (
              <>
                <section className="book-card">
                  <h3>أدخل بياناتك</h3>
                  <p>أضف بيانات المسافرين وراجع خيارات الأمتعة</p>

                  {travelers.map((traveler, index) => {
                    const isAdult = index < draft.adults;
                    const open = editingTraveler === index;
                    return (
                      <div key={index} className="traveler-box">
                        <div className="traveler-box-head">
                          <strong>
                            {isAdult ? "بالغ" : "طفل"} {index + 1}
                          </strong>
                          {travelerComplete(traveler) ? (
                            <em className="ok">
                              {traveler.firstName} {traveler.lastName}
                            </em>
                          ) : (
                            <em>بيانات ناقصة</em>
                          )}
                          <div className="traveler-actions">
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() => openPassportPicker(index)}
                              disabled={scanningIndex === index}
                            >
                              {scanningIndex === index
                                ? "جارٍ المسح..."
                                : "مسح الجواز بالصورة"}
                            </button>
                            <button
                              type="button"
                              className="btn secondary"
                              onClick={() =>
                                setEditingTraveler(open ? null : index)
                              }
                            >
                              {open
                                ? "إخفاء النموذج"
                                : "إضافة بيانات هذا المسافر"}
                            </button>
                          </div>
                        </div>

                        {open ? (
                          <div className="traveler-form">
                            <div className="passport-scan-banner">
                              <div>
                                <strong>ماسح الجواز بالذكاء الاصطناعي</strong>
                                <p>
                                  ارفع صورة واضحة لصفحة الجواز أو MRZ ليتم ملء
                                  الاسم، الميلاد، الجنسية، ورقم الجواز تلقائيًا.
                                </p>
                              </div>
                              <button
                                type="button"
                                className="btn"
                                onClick={() => openPassportPicker(index)}
                                disabled={scanningIndex === index}
                              >
                                {scanningIndex === index
                                  ? "تحليل الصورة..."
                                  : "رفع صورة الجواز"}
                              </button>
                            </div>
                            {scanHint && editingTraveler === index ? (
                              <p className="scan-hint">{scanHint}</p>
                            ) : null}
                            <label className="field field-title">
                              <span>اللقب</span>
                              <select
                                value={traveler.title}
                                onChange={(e) =>
                                  updateTraveler(index, {
                                    title: e.target.value,
                                  })
                                }
                              >
                                <option value="mr">السيد</option>
                                <option value="mrs">السيدة</option>
                                <option value="ms">الآنسة</option>
                                <option value="child">طفل</option>
                              </select>
                            </label>
                            <div className="name-row">
                              <label className="field">
                                <span>الاسم الأول *</span>
                                <input
                                  value={traveler.firstName}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      firstName: e.target.value,
                                    })
                                  }
                                  placeholder="كما في جواز السفر"
                                />
                              </label>
                              <label className="field">
                                <span>اسم العائلة *</span>
                                <input
                                  value={traveler.lastName}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      lastName: e.target.value,
                                    })
                                  }
                                  placeholder="كما في جواز السفر"
                                />
                              </label>
                            </div>
                            <div className="name-row">
                              <label className="field">
                                <span>تاريخ الميلاد *</span>
                                <input
                                  type="date"
                                  value={traveler.birthDate}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      birthDate: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="field">
                                <span>الجنسية</span>
                                <input
                                  value={traveler.nationality}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      nationality: e.target.value,
                                    })
                                  }
                                  placeholder="SA"
                                />
                              </label>
                            </div>
                            <div className="name-row">
                              <label className="field">
                                <span>رقم جواز السفر *</span>
                                <input
                                  value={traveler.passportNumber}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      passportNumber: e.target.value,
                                    })
                                  }
                                />
                              </label>
                              <label className="field">
                                <span>انتهاء الجواز</span>
                                <input
                                  type="date"
                                  value={traveler.passportExpiry}
                                  onChange={(e) =>
                                    updateTraveler(index, {
                                      passportExpiry: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </div>
                          </div>
                        ) : null}

                        <div className="baggage-mini">
                          <strong>في كل رحلة</strong>
                          <div className="baggage-mini-row">
                            <span>إلى {draft.destination}</span>
                            <em>حقيبة يد مشمولة · 7 كجم</em>
                          </div>
                          {draft.tripType === "roundtrip" ? (
                            <div className="baggage-mini-row">
                              <span>إلى {draft.origin}</span>
                              <em>حقيبة يد مشمولة · 7 كجم</em>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </section>

                <div className="book-alert">
                  قد تحتاج لاستلام وإعادة تسليم الأمتعة في بعض المطارات حسب مسار
                  الرحلة.
                </div>

                <section className="book-card">
                  <h3>
                    بيانات التواصل <span className="req">* مطلوب</span>
                  </h3>
                  <div className="contact-row">
                    <label className="field">
                      <span>البريد الإلكتروني *</span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                      />
                      <small className="hint">
                        سنرسل تأكيد الرحلة إلى هذا البريد
                      </small>
                    </label>
                    <label className="field">
                      <span>رقم الجوال *</span>
                      <div className="phone-row">
                        <select
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value)}
                        >
                          <option value="+965">🇰🇼 +965</option>
                          <option value="+966">🇸🇦 +966</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+974">🇶🇦 +974</option>
                          <option value="+20">🇪🇬 +20</option>
                        </select>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="5xxxxxxxx"
                        />
                      </div>
                      <small className="hint contact-hint-spacer" aria-hidden="true">
                        &nbsp;
                      </small>
                    </label>
                  </div>
                </section>
              </>
            ) : null}

            {step === 1 ? (
              <section className="book-card">
                <h3>نوع التذكرة</h3>
                <p>اختر المرونة المناسبة لرحلتك</p>
                <div className="option-stack">
                  <label
                    className={`ticket-type${ticketType === "standard" ? " on" : ""}`}
                  >
                    <input
                      type="radio"
                      checked={ticketType === "standard"}
                      onChange={() => setTicketType("standard")}
                    />
                    <div>
                      <strong>قياسية</strong>
                      <span>الأفضل سعرًا · تغيير برسوم</span>
                    </div>
                    <em>مشمولة</em>
                  </label>
                  <label
                    className={`ticket-type${ticketType === "flexible" ? " on" : ""}`}
                  >
                    <input
                      type="radio"
                      checked={ticketType === "flexible"}
                      onChange={() => setTicketType("flexible")}
                    />
                    <div>
                      <strong>مرنة</strong>
                      <span>تغيير التاريخ أسهل</span>
                    </div>
                    <em>+ {formatMoneyMinor(8900, draft.flight.currency)}</em>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="book-card">
                <h3>إضافات</h3>
                <p>اختياري — يمكنك تخطي هذه الخطوة</p>
                <div className="option-stack">
                  <label
                    className={`extra-row${extras.insurance ? " on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={extras.insurance}
                      onChange={(e) =>
                        setExtras({ ...extras, insurance: e.target.checked })
                      }
                    />
                    <div>
                      <strong>تأمين السفر</strong>
                      <span>تغطية أساسية للإلغاء والتأخير</span>
                    </div>
                    <em>+ {formatMoneyMinor(4500, draft.flight.currency)}</em>
                  </label>
                  <label className={`extra-row${extras.priority ? " on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={extras.priority}
                      onChange={(e) =>
                        setExtras({ ...extras, priority: e.target.checked })
                      }
                    />
                    <div>
                      <strong>صعود أولوية</strong>
                      <span>أولوية في الصعود والأمتعة</span>
                    </div>
                    <em>+ {formatMoneyMinor(2500, draft.flight.currency)}</em>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className="book-card">
                <h3>تفضيل المقعد</h3>
                <p>
                  خريطة المقاعد الحقيقية للطائرة غير مربوطة بعد — اختر تفضيلك
                  الآن، والتعيين النهائي يتم عند الإصدار بعد ربط Seat Maps.
                </p>
                <div className="seat-prefs" role="radiogroup" aria-label="تفضيل المقعد">
                  {[
                    { value: "any", label: "أي مقعد", hint: "تلقائي" },
                    { value: "window", label: "نافذة", hint: "إطلالة" },
                    { value: "aisle", label: "ممر", hint: "سهولة حركة" },
                    {
                      value: "extra_leg",
                      label: "مساحة إضافية",
                      hint: "للأرجل",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`seat-pref${seatPref === opt.value ? " on" : ""}`}
                      onClick={() => setSeatPref(opt.value)}
                    >
                      <strong>{opt.label}</strong>
                      <span>{opt.hint}</span>
                    </button>
                  ))}
                </div>
                <div className="book-alert soft">
                  اختيار كرسي محدد برقم الصف/المقعد يحتاج ربط Duffel Seat Maps
                  مع العرض.
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="book-card">
                <h3>المراجعة والدفع</h3>
                <p>راجع الملخص قبل تأكيد الطلب</p>

                <ul className="book-checklist">
                  <li className="book-checklist-item done">
                    <span className="book-checklist-check">✓</span>
                    <div>
                      <strong>بيانات المسافرين</strong>
                      <small>
                        {travelers.length}{" "}
                        {travelers.length === 1 ? "مسافر" : "مسافرين"} · بيانات
                        مكتملة
                      </small>
                    </div>
                  </li>
                  <li className="book-checklist-item done">
                    <span className="book-checklist-check">✓</span>
                    <div>
                      <strong>بيانات التواصل</strong>
                      <small>
                        {email} · {phoneCode} {phone}
                      </small>
                    </div>
                  </li>
                  <li className="book-checklist-item done">
                    <span className="book-checklist-check">✓</span>
                    <div>
                      <strong>نوع التذكرة</strong>
                      <small>
                        {ticketType === "flexible"
                          ? "مرنة — تغيير التاريخ أسهل"
                          : "قياسية — الأفضل سعرًا"}
                      </small>
                    </div>
                  </li>
                  <li
                    className={`book-checklist-item${
                      extras.insurance || extras.priority ? " done" : ""
                    }`}
                  >
                    <span className="book-checklist-check">
                      {extras.insurance || extras.priority ? "✓" : "–"}
                    </span>
                    <div>
                      <strong>الإضافات</strong>
                      <small>
                        {[
                          extras.insurance ? "تأمين السفر" : null,
                          extras.priority ? "صعود أولوية" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "بدون إضافات"}
                      </small>
                    </div>
                  </li>
                </ul>

                <div className="review-grid">
                  <div>
                    <span>المسار</span>
                    <strong>{routeTitle}</strong>
                  </div>
                  <div>
                    <span>الشركة</span>
                    <strong>{airline}</strong>
                  </div>
                  <div>
                    <span>تفضيل المقعد</span>
                    <strong>
                      {
                        (
                          {
                            any: "أي مقعد",
                            window: "نافذة",
                            aisle: "ممر",
                            extra_leg: "مساحة إضافية",
                          } as Record<string, string>
                        )[seatPref]
                      }
                    </strong>
                  </div>
                </div>

                <div className="review-travelers">
                  <strong>أسماء المسافرين كما في جواز السفر</strong>
                  <ul>
                    {travelers.map((t, i) => (
                      <li key={i}>
                        <span>
                          {TITLE_LABELS[t.title] || t.title} {t.firstName}{" "}
                          {t.lastName}
                        </span>
                        <em>{i < draft.adults ? "بالغ" : "طفل"}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="book-card">
                <h3>طريقة الدفع</h3>
                <p>اختر طريقة الدفع لإتمام الحجز بأمان</p>

                <div className="pay-secure-banner">
                  <span className="pay-secure-banner-icon" aria-hidden="true">
                    🔒
                  </span>
                  <div>
                    <strong>الدفع آمن ومشفّر بالكامل</strong>
                    <p>
                      بياناتك محمية بمعايير تشفير قياسية في الصناعة ولن تتم
                      مشاركتها مع أي طرف ثالث.
                    </p>
                  </div>
                </div>

                <div className="pay-methods" role="radiogroup" aria-label="طريقة الدفع">
                  {[
                    { value: "card", label: "بطاقة بنكية", hint: "فيزا / ماستركارد" },
                    { value: "knet", label: "كي نت", hint: "KNET" },
                    { value: "transfer", label: "حوالة بنكية", hint: "تحويل مباشر" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`pay-method${paymentMethod === opt.value ? " on" : ""}`}
                      onClick={() => setPaymentMethod(opt.value as PaymentMethod)}
                    >
                      <strong>{opt.label}</strong>
                      <span>{opt.hint}</span>
                    </button>
                  ))}
                </div>

                {!paymentMethod ? (
                  <p className="pay-select-hint">
                    اختر إحدى طرق الدفع أعلاه لإكمال تأكيد الحجز
                  </p>
                ) : null}

                {paymentMethod === "card" ? (
                  <div className="pay-panel">
                    <label className="field">
                      <span>الاسم على البطاقة *</span>
                      <input
                        value={card.name}
                        onChange={(e) => setCard({ ...card, name: e.target.value })}
                        placeholder="كما هو مطبوع على البطاقة"
                      />
                    </label>
                    <label className="field">
                      <span>رقم البطاقة *</span>
                      <input
                        value={card.number}
                        onChange={(e) => setCard({ ...card, number: e.target.value })}
                        placeholder="0000 0000 0000 0000"
                        inputMode="numeric"
                      />
                    </label>
                    <div className="name-row">
                      <label className="field">
                        <span>تاريخ الانتهاء *</span>
                        <input
                          value={card.expiry}
                          onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                          placeholder="MM/YY"
                        />
                      </label>
                      <label className="field">
                        <span>CVV *</span>
                        <input
                          value={card.cvv}
                          onChange={(e) => setCard({ ...card, cvv: e.target.value })}
                          placeholder="123"
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                    <p className="pay-secure-note">🔒 الدفع مشفّر وآمن — لا تُحفظ بيانات بطاقتك.</p>
                  </div>
                ) : null}

                {paymentMethod === "knet" ? (
                  <div className="pay-panel">
                    <p className="pay-secure-note">
                      سيتم تحويلك لصفحة كي نت الآمنة لإتمام الدفع بعد تأكيد الطلب.
                    </p>
                  </div>
                ) : null}

                {paymentMethod === "transfer" ? (
                  <div className="pay-panel">
                    <ul className="pay-transfer-details">
                      <li>
                        <span>اسم البنك</span>
                        <strong>بنك الكويت الوطني</strong>
                      </li>
                      <li>
                        <span>رقم الحساب (IBAN)</span>
                        <strong>KW00 NBOK 0000 0000 0000 0000 00</strong>
                      </li>
                      <li>
                        <span>المستفيد</span>
                        <strong>Watesly Travel AI</strong>
                      </li>
                    </ul>
                    <p className="pay-secure-note">
                      يبقى الحجز قيد الانتظار حتى تأكيد استلام الحوالة من فريقنا.
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {error ? <p className="error">{error}</p> : null}
            {ok ? <p className="hint">{ok}</p> : null}

            <div className="book-nav">
              <button type="button" className="book-back" onClick={back}>
                ‹ رجوع
              </button>
              <button
                type="button"
                className="btn"
                onClick={next}
                disabled={
                  submitting ||
                  (step === STEPS.length - 1 && !paymentMethod)
                }
              >
                {submitting
                  ? "جارٍ التأكيد..."
                  : step >= STEPS.length - 1
                    ? "تأكيد الطلب والدفع"
                    : "التالي"}
              </button>
            </div>
          </div>

          <aside className="book-side">
            <section className="book-card price-card">
              <h3>تفاصيل السعر</h3>
              <div className="price-row">
                <span>رحلة · بالغ ({draft.adults})</span>
                <strong>
                  {formatMoneyMinor(
                    draft.flight.sellAmountMinor,
                    draft.flight.currency,
                  )}
                </strong>
              </div>
              {ticketType === "flexible" ? (
                <div className="price-row">
                  <span>مرونة التذكرة</span>
                  <strong>
                    {formatMoneyMinor(8900, draft.flight.currency)}
                  </strong>
                </div>
              ) : null}
              {extras.insurance ? (
                <div className="price-row">
                  <span>تأمين</span>
                  <strong>
                    {formatMoneyMinor(4500, draft.flight.currency)}
                  </strong>
                </div>
              ) : null}
              {extras.priority ? (
                <div className="price-row">
                  <span>صعود أولوية</span>
                  <strong>
                    {formatMoneyMinor(2500, draft.flight.currency)}
                  </strong>
                </div>
              ) : null}
              <div className="price-row muted">
                <span>الضرائب ورسوم المطار</span>
                <strong>مشمولة</strong>
              </div>
              <div className="price-total">
                <span>الإجمالي</span>
                <strong>
                  {formatMoneyMinor(total, draft.flight.currency)}
                </strong>
              </div>
              <p className="hint">يشمل الضرائب والرسوم · بدون رسوم مخفية</p>
            </section>

            <section className="book-card assist-card">
              <strong>هل تحتاج مساعدة خاصة في المطار؟</strong>
              <p>
                يمكنك طلب المساعدة بعد تأكيد الحجز عبر فريق الدعم أو صفحة
                الحجوزات.
              </p>
              <Link href="/dashboard/bookings">عرض الحجوزات</Link>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
