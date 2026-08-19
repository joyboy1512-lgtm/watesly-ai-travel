"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import "../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  clearBookingDraft,
  getBookingDraft,
  type BookingDraft,
} from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";

type Traveler = {
  title: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  passportNumber: string;
};

function emptyTraveler(): Traveler {
  return {
    title: "mr",
    firstName: "",
    lastName: "",
    birthDate: "",
    nationality: "KW",
    passportNumber: "",
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

export default function PublicBookPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);

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
      return;
    }
    setName(session.customer.name || "");
    setEmail(session.customer.email || "");
    setPhone(session.customer.phone);
    const count =
      stored.serviceType === "activity"
        ? Math.max(1, stored.adults)
        : Math.max(1, stored.adults + stored.children);
    setTravelers(Array.from({ length: count }, emptyTraveler));
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
                guests: travelers,
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
          extras: { guestName: name },
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

  if (!draft) return null;

  return (
    <StoreFront>
      {bookingId ? (
        <section className="shop-panel">
          <h1>تم حفظ طلبك</h1>
          <p>رقم الطلب: {bookingId}</p>
          <p className="shop-hint">
            لم يُخصم أي مبلغ الآن. سيتواصل فريق WeekendGate لتأكيد الحجز وإتمام
            الدفع.
          </p>
          <Link className="shop-btn" href="/account">
            عرض رحلاتي
          </Link>
        </section>
      ) : (
        <section className="shop-panel">
          <h1>إتمام الطلب</h1>
          <p>{draftTitle(draft)}</p>
          <p>
            <strong>
              {formatMoneyMinor(draftPrice(draft), draftCurrency(draft))}
            </strong>
          </p>
          {error ? <p className="shop-error">{error}</p> : null}

          {needLogin ? (
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
          ) : (
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
              {travelers.map((traveler, idx) => (
                <div key={idx} className="shop-form-row">
                  <label>
                    المسافر {idx + 1}
                    <input
                      value={traveler.firstName}
                      placeholder="الاسم الأول"
                      onChange={(e) =>
                        setTravelers((rows) =>
                          rows.map((row, i) =>
                            i === idx ? { ...row, firstName: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    العائلة
                    <input
                      value={traveler.lastName}
                      onChange={(e) =>
                        setTravelers((rows) =>
                          rows.map((row, i) =>
                            i === idx ? { ...row, lastName: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              ))}
              <p className="shop-hint">
                الدفع الإلكتروني غير مفعّل بعد. سيُحفظ الطلب غير مدفوع ليتابعه
                الموظفون.
              </p>
              <button
                type="button"
                className="shop-btn"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? "جارٍ الحفظ..." : "حفظ الطلب بدون دفع"}
              </button>
            </div>
          )}
        </section>
      )}
    </StoreFront>
  );
}
