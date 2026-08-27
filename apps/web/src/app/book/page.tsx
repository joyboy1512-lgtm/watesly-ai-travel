"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, type Dispatch, type SetStateAction } from "react";
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
import { HotelCheckout } from "@/components/hotels/HotelCheckout";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import type { HotelBookingDraft, HotelRoomGuestDraft } from "@/lib/booking-draft";

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
    gender: "",
  };
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
  return Boolean(t.firstName.trim() && t.lastName.trim() && t.gender && t.birthDate);
}

function splitBirthDate(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { y: "", m: "", d: "" };
  const [y, m, d] = iso.split("-");
  return { y: y || "", m: m || "", d: d || "" };
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
  const dob = splitBirthDate(editing?.birthDate || "");

  function updateEditing(patch: Partial<Traveler>) {
    if (editIndex == null) return;
    setTravelers((rows) =>
      rows.map((row, i) => (i === editIndex ? { ...row, ...patch } : row)),
    );
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

      {editing && editIndex != null ? (
        <div
          className="shop-traveler-modal-backdrop"
          onClick={() => setEditIndex(null)}
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
              الجنس كما في وثيقة السفر
              <select
                value={editing.gender}
                onChange={(e) => {
                  const gender = e.target.value;
                  updateEditing({
                    gender,
                    title: gender === "female" ? "ms" : "mr",
                  });
                }}
              >
                <option value="">اختر</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </label>
            <label>
              تاريخ الميلاد
              <div className="shop-traveler-dob">
                <select
                  value={dob.m}
                  onChange={(e) =>
                    updateEditing({
                      birthDate: joinBirthDate(dob.y, e.target.value, dob.d),
                    })
                  }
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
                  value={dob.d}
                  onChange={(e) =>
                    updateEditing({
                      birthDate: joinBirthDate(dob.y, dob.m, e.target.value.replace(/\D/g, "")),
                    })
                  }
                />
                <input
                  inputMode="numeric"
                  placeholder="سنة"
                  maxLength={4}
                  value={dob.y}
                  onChange={(e) =>
                    updateEditing({
                      birthDate: joinBirthDate(e.target.value.replace(/\D/g, ""), dob.m, dob.d),
                    })
                  }
                />
              </div>
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
      }>;
    }>("/shop/me")
      .then((me) => {
        if (!me.travelers?.length) return;
        setTravelers((prev) =>
          prev.map((row, idx) => {
            const saved = me.travelers[idx];
            if (!saved) return row;
            return {
              title: saved.title || "mr",
              firstName: saved.firstName,
              lastName: saved.lastName,
              birthDate: saved.birthDate?.slice(0, 10) || "",
              nationality: saved.nationality || "KW",
              passportNumber: saved.passportNumber || "",
              gender: saved.title === "ms" || saved.title === "mrs" ? "female" : "male",
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
    if (!name.trim() || !phone.trim()) {
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
          contact: { email, phone },
          extras: {
            guestName: name,
            specialRequests: specialRequests || undefined,
            paymentMethod: paymentMethod || undefined,
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
