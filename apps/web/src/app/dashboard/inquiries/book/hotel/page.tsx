"use client";

import "../../../../hotel-rich.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import {
  clearBookingDraft,
  getBookingDraft,
  type HotelBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";

const STEPS = ["بيانات النزلاء", "الدفع وتأكيد الحجز"] as const;

type PaymentMethod = "card" | "knet" | "transfer";

type Guest = {
  title: string;
  firstName: string;
  lastName: string;
  nationality: string;
};

function emptyGuest(): Guest {
  return { title: "mr", firstName: "", lastName: "", nationality: "SA" };
}

function emptyCard() {
  return { name: "", number: "", expiry: "", cvv: "" };
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

function nightsBetween(from: string, to: string) {
  if (!from || !to) return 1;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / (24 * 60 * 60 * 1000)));
}

const ROOM_OPTIONS = [
  {
    value: "standard",
    label: "غرفة قياسية",
    hint: "بدون وجبات — إلغاء مجاني حتى 24 ساعة",
    extra: 0,
  },
  {
    value: "breakfast",
    label: "غرفة مع إفطار",
    hint: "إفطار بوفيه مفتوح لكل النزلاء",
    extra: 3500,
  },
  {
    value: "flexible",
    label: "غرفة مرنة",
    hint: "إلغاء مجاني حتى يوم الوصول",
    extra: 5500,
  },
] as const;

function paymentLabel(type?: string) {
  if (type === "AT_HOTEL") return "الدفع في الفندق";
  if (type === "AT_WEB") return "الدفع أونلاين";
  return type || "—";
}

export default function HotelBookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelBookingDraft | null>(null);
  const [step, setStep] = useState(0);
  const [guests, setGuests] = useState<Guest[]>([emptyGuest()]);
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+965");
  const [phone, setPhone] = useState("");
  const [roomOption, setRoomOption] = useState<(typeof ROOM_OPTIONS)[number]["value"]>(
    "standard",
  );
  const [extras, setExtras] = useState({ breakfast: false, parking: false, earlyCheckin: false });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [card, setCard] = useState(emptyCard());
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored) {
      router.replace("/dashboard/inquiries");
      return;
    }
    if (stored.serviceType !== "hotel") {
      if (stored.serviceType === "transfer") {
        router.replace("/dashboard/inquiries/book/transfer");
        return;
      }
      router.replace("/dashboard/inquiries/book");
      return;
    }
    setDraft(stored);
    const count = Math.max(1, stored.adults + stored.children);
    setGuests(Array.from({ length: count }, () => emptyGuest()));
  }, [router]);

  const nights = useMemo(
    () => (draft ? nightsBetween(draft.checkIn, draft.checkOut) : 1),
    [draft],
  );

  const total = useMemo(() => {
    if (!draft) return 0;
    let amount = draft.hotel.sellAmountMinor;
    if (!draft.selectedRate) {
      const room = ROOM_OPTIONS.find((r) => r.value === roomOption);
      if (room) amount += room.extra * nights;
    }
    if (extras.breakfast && !draft.selectedRate?.boardCode?.match(/BB|HB|FB|AI/)) {
      amount += 2500 * nights;
    }
    if (extras.parking) amount += 1500 * nights;
    if (extras.earlyCheckin) amount += 2000;
    return amount;
  }, [draft, roomOption, extras, nights]);

  function updateGuest(index: number, patch: Partial<Guest>) {
    setGuests((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  }

  function guestComplete(g: Guest) {
    return Boolean(g.firstName.trim() && g.lastName.trim());
  }

  function validateStep() {
    if (step === 0) {
      if (!guests.every(guestComplete)) {
        setError("أكمل أسماء جميع النزلاء قبل المتابعة");
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
            serviceType: "hotel",
            inquiryId: draft.inquiryId,
            quoteItemId: draft.quoteItemId,
            offer: {
              id: draft.hotel.id,
              description: draft.hotel.description,
              sellAmountMinor: total,
              currency: draft.hotel.currency,
              details: {
                ...draft.hotel.details,
                selectedRate: draft.selectedRate,
              },
              providerOfferRef: draft.selectedRate?.rateKey || draft.hotel.id,
            },
            stay: {
              location: draft.location,
              locationLabel: draft.locationLabel,
              checkIn: draft.checkIn,
              checkOut: draft.checkOut,
              rooms: draft.rooms,
            },
            guests,
            adults: draft.adults,
            children: draft.children,
            contact: { email, phone: `${phoneCode} ${phone}` },
            extras: { ...extras, roomOption },
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
    if (step === 0) {
      router.push("/dashboard/inquiries");
      return;
    }
    setStep((s) => s - 1);
  }

  if (!draft) {
    return (
      <AppShell title="إتمام حجز الفندق">
        <p className="lead">جارٍ تحميل بيانات الإقامة...</p>
      </AppShell>
    );
  }

  if (bookingId) {
    return (
      <AppShell title="إتمام حجز الفندق">
        <div className="book-success">
          <div className="book-success-icon">✓</div>
          <h2>تم تأكيد حجز الفندق بنجاح</h2>
          <p>
            سيتم مراجعة الحجز وتأكيده من فريقنا قريبًا. تم إرسال تفاصيل الإقامة
            إلى بريدك الإلكتروني.
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

  const hotelName = String(draft.hotel.details.name || "فندق");

  return (
    <AppShell title="إتمام حجز الفندق">
      <div className="book-page">
        <ol className="book-steps">
          {STEPS.map((label, idx) => (
            <li
              key={label}
              className={idx === step ? "active" : idx < step ? "done" : undefined}
            >
              <span>{idx + 1}</span>
              <em>{label}</em>
            </li>
          ))}
        </ol>

        <div className="book-route-head">
          <p>
            {draft.rooms} غرفة · {draft.adults + draft.children} نزيل ·{" "}
            {formatTripDate(draft.checkIn)} — {formatTripDate(draft.checkOut)} ·{" "}
            {nights} ليلة
          </p>
          <h2>{hotelName}</h2>
          {draft.selectedRate?.rateComments ? (
            <p className="hotel-rate-comments">{draft.selectedRate.rateComments}</p>
          ) : null}
        </div>

        <div className="book-layout">
          <div className="book-main">
            {step === 0 ? (
              <>
                <section className="book-card">
                  <h3>بيانات النزلاء</h3>
                  <p>أضف اسم كل نزيل كما هو في الهوية أو جواز السفر</p>

                  {guests.map((guest, index) => {
                    const isAdult = index < draft.adults;
                    return (
                      <div key={index} className="traveler-box">
                        <div className="traveler-box-head">
                          <strong>
                            {isAdult ? "بالغ" : "طفل"} {index + 1}
                          </strong>
                          {guestComplete(guest) ? (
                            <em className="ok">
                              {guest.firstName} {guest.lastName}
                            </em>
                          ) : (
                            <em>بيانات ناقصة</em>
                          )}
                        </div>
                        <div className="traveler-form">
                          <label className="field field-title">
                            <span>اللقب</span>
                            <select
                              value={guest.title}
                              onChange={(e) => updateGuest(index, { title: e.target.value })}
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
                                value={guest.firstName}
                                onChange={(e) =>
                                  updateGuest(index, { firstName: e.target.value })
                                }
                              />
                            </label>
                            <label className="field">
                              <span>اسم العائلة *</span>
                              <input
                                value={guest.lastName}
                                onChange={(e) =>
                                  updateGuest(index, { lastName: e.target.value })
                                }
                              />
                            </label>
                          </div>
                          <label className="field">
                            <span>الجنسية</span>
                            <input
                              value={guest.nationality}
                              onChange={(e) =>
                                updateGuest(index, { nationality: e.target.value })
                              }
                              placeholder="SA"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </section>

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
                      <small className="hint">سنرسل تأكيد الحجز إلى هذا البريد</small>
                    </label>
                    <label className="field">
                      <span>رقم الجوال *</span>
                      <div className="phone-row">
                        <select value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
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
              <>
                <section className="book-card">
                  <h3>الدفع وتأكيد الحجز</h3>
                  <p>راجع تفاصيل الحجز ثم أكّد الدفع</p>

                  <ul className="book-checklist">
                    <li className="book-checklist-item done">
                      <span className="book-checklist-check">✓</span>
                      <div>
                        <strong>بيانات النزلاء</strong>
                        <small>
                          {guests.length}{" "}
                          {guests.length === 1 ? "نزيل" : "نزلاء"} · بيانات
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
                        <strong>باقة الغرفة</strong>
                        <small>
                          {draft.selectedRate
                            ? `${draft.selectedRate.roomName} · ${draft.selectedRate.boardName}`
                            : ROOM_OPTIONS.find((r) => r.value === roomOption)?.label}
                        </small>
                      </div>
                    </li>
                  </ul>

                  <div className="review-grid">
                    <div>
                      <span>الفندق</span>
                      <strong>{hotelName}</strong>
                    </div>
                    <div>
                      <span>الموقع</span>
                      <strong>{draft.locationLabel || draft.location}</strong>
                    </div>
                    <div>
                      <span>الإقامة</span>
                      <strong>
                        {formatTripDate(draft.checkIn)} — {formatTripDate(draft.checkOut)} ·{" "}
                        {nights} ليلة
                      </strong>
                    </div>
                  </div>

                  <div className="review-travelers">
                    <strong>أسماء النزلاء</strong>
                    <ul>
                      {guests.map((g, i) => (
                        <li key={i}>
                          <span>
                            {g.firstName} {g.lastName}
                          </span>
                          <em>{i < draft.adults ? "بالغ" : "طفل"}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

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
              </>
            ) : null}

            {error ? <p className="error">{error}</p> : null}

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
                <span>
                  {nights} ليلة · {draft.rooms} غرفة
                </span>
                <strong>
                  {formatMoneyMinor(draft.hotel.sellAmountMinor, draft.hotel.currency)}
                </strong>
              </div>
              {draft.selectedRate ? (
                <div className="price-row">
                  <span>
                    {draft.selectedRate.roomName} · {draft.selectedRate.boardName}
                  </span>
                  <strong>
                    {formatMoneyMinor(draft.hotel.sellAmountMinor, draft.hotel.currency)}
                  </strong>
                </div>
              ) : roomOption !== "standard" ? (
                <div className="price-row">
                  <span>{ROOM_OPTIONS.find((r) => r.value === roomOption)?.label}</span>
                  <strong>
                    {formatMoneyMinor(
                      (ROOM_OPTIONS.find((r) => r.value === roomOption)?.extra || 0) * nights,
                      draft.hotel.currency,
                    )}
                  </strong>
                </div>
              ) : null}
              {extras.breakfast ? (
                <div className="price-row">
                  <span>إفطار إضافي</span>
                  <strong>{formatMoneyMinor(2500 * nights, draft.hotel.currency)}</strong>
                </div>
              ) : null}
              {extras.parking ? (
                <div className="price-row">
                  <span>موقف سيارات</span>
                  <strong>{formatMoneyMinor(1500 * nights, draft.hotel.currency)}</strong>
                </div>
              ) : null}
              {extras.earlyCheckin ? (
                <div className="price-row">
                  <span>تسجيل وصول مبكر</span>
                  <strong>{formatMoneyMinor(2000, draft.hotel.currency)}</strong>
                </div>
              ) : null}
              <div className="price-row muted">
                <span>الضرائب ورسوم الخدمة</span>
                <strong>مشمولة</strong>
              </div>
              <div className="price-total">
                <span>الإجمالي</span>
                <strong>{formatMoneyMinor(total, draft.hotel.currency)}</strong>
              </div>
              <p className="hint">يشمل الضرائب والرسوم · بدون رسوم مخفية</p>
            </section>

            <section className="book-card assist-card">
              <strong>تحتاج مساعدة في حجزك؟</strong>
              <p>يمكنك التواصل مع فريق الدعم أو مراجعة حجوزاتك في أي وقت.</p>
              <Link href="/dashboard/bookings">عرض الحجوزات</Link>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
