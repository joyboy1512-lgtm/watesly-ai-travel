"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter } from "next/navigation";
import "../../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { HotelCheckout } from "@/components/hotels/HotelCheckout";
import {
  clearBookingDraft,
  getBookingDraft,
  type HotelBookingDraft,
} from "@/lib/booking-draft";
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

export default function HotelGuestsPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<HotelBookingDraft | null>(null);
  const [travelers, setTravelers] = useState<Traveler[]>([emptyTraveler()]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored || stored.serviceType !== "hotel") {
      router.replace("/");
      return;
    }
    setDraft(stored);
    const session = getShopSession();
    if (!session) {
      setNeedLogin(true);
      setName(stored.contactName || "");
      setEmail(stored.contactEmail || "");
      setPhone(stored.contactPhone || "");
      setTravelers(
        Array.from({ length: Math.max(1, stored.adults + stored.children) }, emptyTraveler),
      );
      return;
    }
    setName(stored.contactName || session.customer.name || "");
    setEmail(stored.contactEmail || session.customer.email || "");
    setPhone(stored.contactPhone || session.customer.phone);
    setSpecialRequests(stored.specialRequests || "");
    setPaymentMethod(stored.paymentMethod || null);
    if (stored.travelers?.length) {
      setTravelers(
        stored.travelers.map((t) => ({
          ...emptyTraveler(),
          firstName: t.firstName,
          lastName: t.lastName,
        })),
      );
    } else {
      setTravelers(
        Array.from({ length: Math.max(1, stored.adults + stored.children) }, emptyTraveler),
      );
    }
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
      const result = await shopFetch<{ booking: { id: string } }>("/shop/book", {
        method: "POST",
        body: JSON.stringify({
          serviceType: "hotel",
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

  if (!draft) {
    return (
      <StoreFront>
        <div className="shop-flight-results-loading">
          <div className="shop-flight-spinner" aria-hidden />
          <p>جاري تحميل بيانات الضيوف…</p>
        </div>
      </StoreFront>
    );
  }

  return (
    <StoreFront>
      {bookingId ? (
        <section className="shop-panel">
          <ShopMockBanner compact kind="hotel" />
          <h1>تم حفظ طلبك</h1>
          <p>رقم الطلب: {bookingId}</p>
          <p className="shop-hint">
            هذه مرحلة اختبار — لم يُخصم أي مبلغ. سيتواصل فريق WeekendGate لتأكيد الطلب عند تفعيل
            الحجز الحقيقي.
          </p>
          <Link className="shop-btn" href="/account">
            عرض رحلاتي
          </Link>
        </section>
      ) : needLogin ? (
        <section className="shop-panel">
          <ShopMockBanner compact kind="hotel" />
          <h1>إتمام الطلب</h1>
          <p>{draft.hotel.description}</p>
          {error ? <p className="shop-error">{error}</p> : null}
          <form className="shop-form" onSubmit={unlock}>
            <p>أدخل جوالك لحفظ الطلب على حسابك.</p>
            <label>
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              الجوال
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
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
      ) : (
        <HotelCheckout
          draft={draft}
          travelers={travelers}
          setTravelers={setTravelers as Dispatch<SetStateAction<Traveler[]>>}
          email={email}
          setEmail={setEmail}
          phone={phone}
          setPhone={setPhone}
          name={name}
          setName={setName}
          specialRequests={specialRequests}
          setSpecialRequests={setSpecialRequests}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          error={error}
          submitting={submitting}
          onSubmit={() => void submit()}
        />
      )}
    </StoreFront>
  );
}
