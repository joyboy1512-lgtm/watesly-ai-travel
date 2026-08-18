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
  type TransferBookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import { transferPointKindLabelAr } from "@watesly-travel/shared";

const STEPS = ["بيانات الركاب", "الدفع وتأكيد الحجز"] as const;

type PaymentMethod = "card" | "knet" | "transfer";

type Passenger = {
  title: string;
  firstName: string;
  lastName: string;
  nationality: string;
};

function emptyPassenger(): Passenger {
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

function formatTime(value?: string) {
  const t = String(value || "").trim();
  return t || "—";
}

export default function TransferBookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<TransferBookingDraft | null>(null);
  const [step, setStep] = useState(0);
  const [passengers, setPassengers] = useState<Passenger[]>([emptyPassenger()]);
  const [email, setEmail] = useState("");
  const [phoneCode, setPhoneCode] = useState("+965");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
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
    if (stored.serviceType !== "transfer") {
      router.replace("/dashboard/inquiries/book");
      return;
    }
    setDraft(stored);
    const count = Math.max(1, stored.adults + stored.children);
    setPassengers(Array.from({ length: count }, () => emptyPassenger()));
  }, [router]);

  const total = useMemo(() => draft?.transfer.sellAmountMinor || 0, [draft]);

  function updatePassenger(index: number, patch: Partial<Passenger>) {
    setPassengers((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function passengerComplete(row: Passenger) {
    return Boolean(row.firstName.trim() && row.lastName.trim());
  }

  function validateStep() {
    if (step === 0) {
      const lead = passengers[0];
      if (!lead || !passengerComplete(lead)) {
        setError("أكمل بيانات المسافر الرئيسي (الاسم الأول واسم العائلة)");
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
      const lead = passengers[0];
      if (!lead) return;
      const travelersForApi = [
        lead,
        ...passengers.slice(1).filter(passengerComplete),
      ];
      const result = await apiFetch<{ booking: { id: string } }>(
        "/bookings/from-draft",
        {
          method: "POST",
          body: JSON.stringify({
            serviceType: "transfer",
            inquiryId: draft.inquiryId,
            quoteItemId: draft.quoteItemId,
            offer: {
              id: draft.transfer.id,
              description: draft.transfer.description,
              sellAmountMinor: total,
              currency: draft.transfer.currency,
              details: draft.transfer.details,
              providerKey: String(
                draft.transfer.details.provider || "hotelbeds",
              ),
              providerOfferRef: draft.transfer.id,
            },
            route: {
              origin: draft.from,
              destination: draft.to,
              originLabel: draft.from,
              destinationLabel: draft.to,
              departDate: draft.outboundDate,
              returnDate: draft.inboundDate,
            },
            guests: travelersForApi,
            travelers: travelersForApi,
            adults: draft.adults,
            children: draft.children,
            contact: { email, phone: `${phoneCode} ${phone}` },
            extras: {
              outboundTime: draft.outboundTime,
              inboundTime: draft.inboundTime,
              city: draft.city,
              pickupKind: draft.pickupKind,
              dropoffKind: draft.dropoffKind,
              passengerCount: draft.adults + draft.children,
            },
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
      <AppShell title="إتمام حجز النقل">
        <p className="lead">جارٍ تحميل بيانات النقل...</p>
      </AppShell>
    );
  }

  if (bookingId) {
    return (
      <AppShell title="إتمام حجز النقل">
        <div className="book-success">
          <div className="book-success-icon">✓</div>
          <h2>تم تسجيل طلب النقل بنجاح</h2>
          <p>
            الحجز محلي حالياً وسيتولّى الفريق تأكيده. تفاصيل السيارة والمسار
            محفوظة مع الطلب.
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

  const vehicle = String(
    draft.transfer.details.vehicleName || draft.transfer.description,
  );
  const typeLabel = String(
    draft.transfer.details.transferTypeLabel || "نقل",
  );

  return (
    <AppShell title="إتمام حجز النقل">
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
            {draft.city ? `${draft.city} · ` : ""}
            {typeLabel} · {draft.adults + draft.children} ركاب ·{" "}
            {formatTripDate(draft.outboundDate)} {formatTime(draft.outboundTime)}
            {draft.inboundDate
              ? ` — ${formatTripDate(draft.inboundDate)} ${formatTime(draft.inboundTime)}`
              : ""}
          </p>
          <h2>{vehicle}</h2>
          <p>
            {transferPointKindLabelAr(draft.pickupKind)}: {draft.from} →{" "}
            {transferPointKindLabelAr(draft.dropoffKind)}: {draft.to}
          </p>
        </div>

        <div className="book-layout">
          <div className="book-main">
            {step === 0 ? (
              <>
                <section className="book-card">
                  <h3>بيانات الركاب</h3>
                  <p>
                    المسافر الرئيسي مطلوب. أسماء الركاب الإضافيين اختيارية حتى
                    تفعيل الحجز الحي مع Hotelbeds.
                  </p>

                  {passengers.map((row, index) => {
                    const isAdult = index < draft.adults;
                    const isLead = index === 0;
                    return (
                      <div key={index} className="traveler-box">
                        <div className="traveler-box-head">
                          <strong>
                            {isLead
                              ? "المسافر الرئيسي *"
                              : `${isAdult ? "بالغ" : "طفل"} ${index + 1} (اختياري)`}
                          </strong>
                          {passengerComplete(row) ? (
                            <em className="ok">
                              {row.firstName} {row.lastName}
                            </em>
                          ) : isLead ? (
                            <em>بيانات ناقصة</em>
                          ) : (
                            <em>يمكن تركه فارغاً</em>
                          )}
                        </div>
                        <div className="traveler-form">
                          <label className="field field-title">
                            <span>اللقب</span>
                            <select
                              value={row.title}
                              onChange={(e) =>
                                updatePassenger(index, { title: e.target.value })
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
                              <span>{isLead ? "الاسم الأول *" : "الاسم الأول"}</span>
                              <input
                                value={row.firstName}
                                onChange={(e) =>
                                  updatePassenger(index, {
                                    firstName: e.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="field">
                              <span>{isLead ? "اسم العائلة *" : "اسم العائلة"}</span>
                              <input
                                value={row.lastName}
                                onChange={(e) =>
                                  updatePassenger(index, {
                                    lastName: e.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <label className="field">
                            <span>الجنسية</span>
                            <input
                              value={row.nationality}
                              onChange={(e) =>
                                updatePassenger(index, {
                                  nationality: e.target.value,
                                })
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
                      <small className="hint">
                        سنرسل تأكيد الحجز إلى هذا البريد
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
                    </label>
                  </div>
                </section>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <section className="book-card">
                  <h3>الدفع وتأكيد الحجز</h3>
                  <p>راجع تفاصيل النقل ثم أكّد الطلب</p>

                  <ul className="book-checklist">
                    <li className="book-checklist-item done">
                      <span className="book-checklist-check">✓</span>
                      <div>
                        <strong>بيانات الركاب</strong>
                        <small>
                          {passengers.length}{" "}
                          {passengers.length === 1 ? "راكب" : "ركاب"}
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
                        <strong>المركبة</strong>
                        <small>
                          {typeLabel} · {vehicle}
                        </small>
                      </div>
                    </li>
                  </ul>

                  <div className="review-grid">
                    <div>
                      <span>من</span>
                      <strong>{draft.from}</strong>
                    </div>
                    <div>
                      <span>إلى</span>
                      <strong>{draft.to}</strong>
                    </div>
                    <div>
                      <span>الذهاب</span>
                      <strong>
                        {formatTripDate(draft.outboundDate)}{" "}
                        {formatTime(draft.outboundTime)}
                      </strong>
                    </div>
                    {draft.inboundDate ? (
                      <div>
                        <span>العودة</span>
                        <strong>
                          {formatTripDate(draft.inboundDate)}{" "}
                          {formatTime(draft.inboundTime)}
                        </strong>
                      </div>
                    ) : null}
                  </div>

                  <div className="review-travelers">
                    <strong>أسماء الركاب</strong>
                    <ul>
                      {passengers.map((row, i) => (
                        <li key={i}>
                          <span>
                            {row.firstName} {row.lastName}
                          </span>
                          <em>{i < draft.adults ? "بالغ" : "طفل"}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>

                <section className="book-card">
                  <h3>طريقة الدفع</h3>
                  <p>اختر طريقة الدفع لإتمام الطلب</p>

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
                        onClick={() =>
                          setPaymentMethod(opt.value as PaymentMethod)
                        }
                      >
                        <strong>{opt.label}</strong>
                        <span>{opt.hint}</span>
                      </button>
                    ))}
                  </div>

                  {paymentMethod === "card" ? (
                    <div className="pay-panel">
                      <label className="field">
                        <span>الاسم على البطاقة *</span>
                        <input
                          value={card.name}
                          onChange={(e) =>
                            setCard({ ...card, name: e.target.value })
                          }
                          placeholder="كما هو مطبوع على البطاقة"
                        />
                      </label>
                      <label className="field">
                        <span>رقم البطاقة *</span>
                        <input
                          value={card.number}
                          onChange={(e) =>
                            setCard({ ...card, number: e.target.value })
                          }
                          placeholder="0000 0000 0000 0000"
                          inputMode="numeric"
                        />
                      </label>
                      <div className="name-row">
                        <label className="field">
                          <span>تاريخ الانتهاء *</span>
                          <input
                            value={card.expiry}
                            onChange={(e) =>
                              setCard({ ...card, expiry: e.target.value })
                            }
                            placeholder="MM/YY"
                          />
                        </label>
                        <label className="field">
                          <span>CVV *</span>
                          <input
                            value={card.cvv}
                            onChange={(e) =>
                              setCard({ ...card, cvv: e.target.value })
                            }
                            placeholder="123"
                            inputMode="numeric"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {paymentMethod === "knet" ? (
                    <div className="pay-panel">
                      <p className="pay-secure-note">
                        سيتم تحويلك لصفحة كي نت الآمنة بعد تأكيد الطلب.
                      </p>
                    </div>
                  ) : null}

                  {paymentMethod === "transfer" ? (
                    <div className="pay-panel">
                      <p className="pay-secure-note">
                        يبقى الحجز قيد الانتظار حتى تأكيد استلام الحوالة من
                        فريقنا.
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
                  submitting || (step === STEPS.length - 1 && !paymentMethod)
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
                  {typeLabel} · {vehicle}
                </span>
                <strong>
                  {formatMoneyMinor(total, draft.transfer.currency)}
                </strong>
              </div>
              <div className="price-row muted">
                <span>الضرائب ورسوم الخدمة</span>
                <strong>مشمولة</strong>
              </div>
              <div className="price-total">
                <span>الإجمالي</span>
                <strong>
                  {formatMoneyMinor(total, draft.transfer.currency)}
                </strong>
              </div>
              <p className="hint">حجز محلي للمراجعة — بدون تأكيد Hotelbeds الحي</p>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
