"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "../../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { HotelCheckout, validateHotelCheckout } from "@/components/hotels/HotelCheckout";
import {
  clearBookingDraft,
  getBookingDraft,
  saveHotelDraft,
  type HotelBookingDraft,
  type HotelRoomGuestDraft,
} from "@/lib/booking-draft";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { translateRoomNameAr } from "@watesly-travel/shared";
import { formatMoneyMinor } from "@/lib/format";
import {
  arabicAdultCount,
  arabicChildCount,
  arabicNightCount,
  arabicRoomCount,
} from "@/lib/hotel-occupancy";

function buildRoomGuests(draft: HotelBookingDraft): HotelRoomGuestDraft[] {
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
    : [
        {
          roomIndex: 0,
          isLead: true,
          title: "mr",
          firstName: "",
          lastName: "",
          type: "adult",
        },
      ];
}

export default function HotelGuestsPage() {
  const router = useRouter();
  const submitLock = useRef(false);
  const [draft, setDraft] = useState<HotelBookingDraft | null>(null);
  const [roomGuests, setRoomGuests] = useState<HotelRoomGuestDraft[]>([]);
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState("+965");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [specialRequests, setSpecialRequests] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const stored = getBookingDraft();
    if (!stored || stored.serviceType !== "hotel") {
      router.replace("/");
      return;
    }
    setDraft(stored);
    setRoomGuests(buildRoomGuests(stored));
    const session = getShopSession();
    if (!session) {
      setNeedLogin(true);
      setName(stored.contactName || "");
      setEmail(stored.contactEmail || "");
      setPhone(stored.contactPhone || "");
      return;
    }
    setName(stored.contactName || session.customer.name || "");
    setEmail(stored.contactEmail || session.customer.email || "");
    setEmailConfirm(stored.contactEmail || session.customer.email || "");
    setPhone(stored.contactPhone || session.customer.phone);
    setSpecialRequests(stored.specialRequests || "");
    setPaymentMethod(stored.paymentMethod || null);
  }, [router]);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "أدخل الاسم";
    if (!phone.trim() || phone.trim().length < 8) errors.phone = "أدخل رقم جوال صحيح";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "البريد غير صحيح";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

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
    if (!draft || submitLock.current || submitting) return;
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
      setError("أكمل الحقول المطلوبة");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setError("");
    try {
      const { serviceType: _s, ...payload } = {
        ...draft,
        contactName: name,
        contactEmail: email,
        contactPhone: phone,
        specialRequests,
        paymentMethod: paymentMethod || undefined,
        roomGuests,
        travelers: roomGuests.map((g) => ({
          firstName: g.firstName,
          lastName: g.lastName,
        })),
      };
      saveHotelDraft(payload);

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
          contact: { email, phone: `${phoneCountry}${phone.replace(/\D/g, "")}` },
          extras: {
            guestName: name,
            specialRequests: specialRequests || undefined,
            paymentMethod: paymentMethod || undefined,
            phoneCountry,
            roomGuests,
            selectedRate: draft.selectedRate,
            priceBreakdown: draft.priceBreakdown,
          },
        }),
      });
      clearBookingDraft();
      setBookingId(result.booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الطلب");
      submitLock.current = false;
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

  const rate = draft.selectedRate;
  const roomLabel = rate ? translateRoomNameAr(rate.roomName).ar : "غرفة";
  const bd = draft.priceBreakdown;
  const payNow = bd?.payNowMinor ?? draft.totalMinor ?? draft.hotel.sellAmountMinor;
  const payAtHotel = bd?.payAtHotelMinor ?? 0;
  const hotelName = String(draft.hotel.details.name || draft.hotel.description || "فندق");

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
        <section className="shop-panel shop-hotel-unlock">
          <ShopMockBanner compact kind="hotel" />
          <h1>إتمام الطلب</h1>
          <div className="shop-hotel-unlock-summary">
            <strong>{hotelName}</strong>
            <p>
              {roomLabel} · {arabicRoomCount(draft.rooms)}
            </p>
            <p>
              {arabicNightCount(draft.nights || 1)} · {arabicAdultCount(draft.adults)}
              {draft.children ? ` · ${arabicChildCount(draft.children)}` : ""}
            </p>
            <p>
              {formatMoneyMinor(payNow, draft.hotel.currency)}
              {payAtHotel > 0
                ? ` + ${formatMoneyMinor(payAtHotel, draft.hotel.currency)} تُدفع في الفندق`
                : ""}
            </p>
          </div>
          {error ? <p className="shop-error">{error}</p> : null}
          <form className="shop-form" onSubmit={unlock} noValidate>
            <p>أدخل بيانات صاحب الطلب لحفظ الحجز على حسابك.</p>
            <label>
              الاسم
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
              />
              {fieldErrors.name ? <em className="shop-field-error">{fieldErrors.name}</em> : null}
            </label>
            <label>
              الجوال
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={Boolean(fieldErrors.phone)}
              />
              {fieldErrors.phone ? <em className="shop-field-error">{fieldErrors.phone}</em> : null}
            </label>
            <label>
              البريد
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <em className="shop-field-error">{fieldErrors.email}</em> : null}
            </label>
            <button className="shop-btn" type="submit" disabled={submitting}>
              {submitting ? "..." : "متابعة"}
            </button>
          </form>
        </section>
      ) : (
        <HotelCheckout
          draft={draft}
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
      )}
    </StoreFront>
  );
}
