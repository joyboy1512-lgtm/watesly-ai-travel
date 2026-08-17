"use client";

import "../../../../hotel-rich.css";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HotelRoomAccordion } from "@/components/hotels/HotelRoomAccordion";
import { saveHotelDraft } from "@/lib/booking-draft";
import { formatMoneyMinor } from "@/lib/format";
import {
  filterHotelOffers,
  rateDisplayMinor,
  type HotelRateOption,
} from "@/lib/hotel-search";
import {
  getHotelSearchSession,
  resolveQuoteItemId,
} from "@/lib/hotel-search-session";

function formatTripDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value || "—";
  }
}

export default function HotelDetailPage() {
  const params = useParams<{ offerId: string }>();
  const router = useRouter();
  const offerId = decodeURIComponent(params.offerId || "");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const session = ready ? getHotelSearchSession() : null;

  const hotel = useMemo(() => {
    if (!session) return null;
    const sort = session.sortKey === "best" ? "price_asc" : session.sortKey;
    const list = filterHotelOffers(session.hotels, session.filters, sort);
    return list.find((h) => h.id === offerId) || null;
  }, [session, offerId]);

  useEffect(() => {
    if (!ready) return;
    if (!session) {
      router.replace("/dashboard/inquiries");
    }
  }, [ready, session, router]);

  if (!ready || !session) {
    return (
      <AppShell title="تفاصيل الفندق">
        <p className="lead">جارٍ تحميل الفندق...</p>
      </AppShell>
    );
  }

  if (!hotel) {
    return (
      <AppShell title="تفاصيل الفندق">
        <div className="hotel-detail-empty">
          <h2>الفندق غير موجود في نتائج البحث الحالية</h2>
          <p>قد تكون الجلسة انتهت أو تغيّرت الفلاتر. أعد البحث من جديد.</p>
          <Link href="/dashboard/inquiries" className="btn">
            العودة للبحث
          </Link>
        </div>
      </AppShell>
    );
  }

  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const nights = session.meta.nights || Number(hotel.details.nights || 1) || 1;
  const location = String(
    hotel.details.zoneName ||
      hotel.details.neighborhood ||
      hotel.details.location ||
      hotel.details.address ||
      session.meta.stayQuery,
  );

  function bookRate(rate: HotelRateOption) {
    const sellMinor = rateDisplayMinor(rate, hotel!, nights);
    saveHotelDraft({
      hotel: {
        id: hotel!.id,
        description: [name, rate.roomName, rate.boardName, `${nights} ليلة`]
          .filter(Boolean)
          .join(" · "),
        sellAmountMinor: sellMinor,
        currency: hotel!.currency,
        details: {
          ...hotel!.details,
          roomType: rate.roomName,
          board: rate.boardName,
          boardCode: rate.boardCode,
          selectedRateKey: rate.rateKey,
        },
      },
      selectedRate: {
        rateKey: rate.rateKey,
        rateType: rate.rateType,
        roomCode: rate.roomCode,
        roomName: rate.roomName,
        boardCode: rate.boardCode,
        boardName: rate.boardName,
        net: rate.net,
        currency: rate.currency,
        paymentType: rate.paymentType,
        freeCancellation: rate.freeCancellation,
      },
      checkIn: session!.meta.departDate,
      checkOut: session!.meta.returnDate,
      rooms: session!.meta.rooms,
      adults: session!.meta.adults,
      children: session!.meta.children,
      location: session!.meta.destination,
      locationLabel: session!.meta.stayQuery,
      createdAt: new Date().toISOString(),
      inquiryId: session!.inquiryId,
      quoteId: session!.quote?.id,
      quoteItemId: resolveQuoteItemId(session!, hotel!.id),
    });
    router.push("/dashboard/inquiries/book/hotel");
  }

  const fromMinor = hotel.displayFromMinor;
  const fromPerNight = nights > 0 ? Math.round(fromMinor / nights) : fromMinor;

  return (
    <AppShell title={name}>
      <div className="hotel-detail-page">
        <nav className="hotel-detail-breadcrumb">
          <Link href="/dashboard/inquiries">← العودة للنتائج</Link>
          <span>{session.meta.stayQuery}</span>
        </nav>

        <header className="hotel-detail-hero">
          <div className="hotel-detail-hero-media">
            {typeof hotel.details.imageUrl === "string" && hotel.details.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(hotel.details.imageUrl)} alt="" />
            ) : (
              <div className={`hotel-detail-hero-placeholder tone-${(stars % 3) + 1}`} />
            )}
          </div>

          <div className="hotel-detail-hero-info">
            <h1>{name}</h1>
            {stars > 0 ? (
              <div className="hotel-search-card-stars">
                {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            ) : null}
            <p className="hotel-detail-location">{location}</p>
            <div className="hotel-detail-stay-chip">
              <span>
                {formatTripDate(session.meta.departDate)} →{" "}
                {formatTripDate(session.meta.returnDate)}
              </span>
              <span>
                {session.meta.rooms} غرفة · {session.meta.adults} بالغ
                {session.meta.children ? ` · ${session.meta.children} طفل` : ""}
              </span>
              <span>
                {nights} {nights === 1 ? "ليلة" : "ليالي"}
              </span>
            </div>
            <div className="hotel-detail-from">
              <small>أقل سعر متاح من</small>
              <strong>{formatMoneyMinor(fromPerNight, hotel.currency)}</strong>
              <em>/ ليلة</em>
            </div>
          </div>
        </header>

        <HotelRoomAccordion hotel={hotel} nights={nights} onBookRate={bookRate} />
      </div>
    </AppShell>
  );
}
