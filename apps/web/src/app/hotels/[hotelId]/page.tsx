"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopMockBanner } from "@/components/shop/ShopMockBanner";
import { saveHotelDraft } from "@/lib/booking-draft";
import {
  buildHotelDraftPriceBreakdown,
  toDraftHotelRate,
} from "@/lib/hotel-draft-price";
import {
  defaultHotelFilters,
  filterHotelOffers,
  rateDisplayMinor,
  type HotelOfferRow,
  type HotelRateOption,
} from "@/lib/hotel-search";
import {
  buildHotelResultsHref,
  nightsBetween,
  occupancyFromSearchParams,
  parseHotelResultsSearch,
} from "@/lib/hotel-results-url";
import {
  getHotelSearchSession,
  resolveQuoteItemId,
} from "@/lib/hotel-search-session";
import { shopFetch } from "@/lib/shop-session";

const HotelDetailModal = dynamic(
  () => import("@/components/hotels/HotelDetailModal").then((m) => m.HotelDetailModal),
  { ssr: false },
);

type HotelRow = HotelOfferRow & {
  matchingRates: HotelRateOption[];
  displayFromMinor: number;
};

function HotelDetailInner() {
  const router = useRouter();
  const params = useParams<{ hotelId: string }>();
  const searchParams = useSearchParams();
  const hotelId = decodeURIComponent(String(params.hotelId || ""));
  const urlParams = useMemo(() => parseHotelResultsSearch(searchParams), [searchParams]);

  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [inquiryId, setInquiryId] = useState<string | undefined>();
  const [quoteItemId, setQuoteItemId] = useState<string | undefined>();
  const [meta, setMeta] = useState({
    stayQuery: urlParams.destination,
    departDate: urlParams.checkIn,
    returnDate: urlParams.checkOut,
    rooms: urlParams.rooms,
    adults: urlParams.adults,
    children: urlParams.children,
    infants: urlParams.infants,
    destinationLabel: urlParams.destinationLabel || urlParams.destination,
    nights: nightsBetween(urlParams.checkIn, urlParams.checkOut),
  });

  const resultsHref = useMemo(() => {
    const session = getHotelSearchSession();
    if (session?.meta) {
      return buildHotelResultsHref({
        destination: session.meta.destination || session.meta.stayQuery,
        destinationLabel: session.meta.destination || session.meta.stayQuery,
        checkIn: session.meta.departDate,
        checkOut: session.meta.returnDate,
        adults: session.meta.adults,
        children: session.meta.children,
        infants: session.meta.infants || 0,
        rooms: session.meta.rooms,
      });
    }
    return buildHotelResultsHref(urlParams);
  }, [urlParams]);

  useEffect(() => {
    const session = getHotelSearchSession();
    if (!session?.hotels?.length || !hotelId) {
      setMissing(true);
      return;
    }
    const raw = session.hotels.find((h) => h.id === hotelId) as HotelOfferRow | undefined;
    if (!raw) {
      setMissing(true);
      return;
    }
    const sortKey =
      session.sortKey === "price_desc" ||
      session.sortKey === "rating_desc" ||
      session.sortKey === "best" ||
      session.sortKey === "distance"
        ? session.sortKey
        : "price_asc";
    const enriched = filterHotelOffers(
      [raw],
      session.filters || defaultHotelFilters(),
      sortKey,
    )[0];
    if (!enriched) {
      setMissing(true);
      return;
    }
    setHotel(enriched);
    setInquiryId(session.inquiryId);
    setQuoteItemId(resolveQuoteItemId(session, hotelId));
    setMeta({
      stayQuery: session.meta.stayQuery || urlParams.destination,
      departDate: session.meta.departDate || urlParams.checkIn,
      returnDate: session.meta.returnDate || urlParams.checkOut,
      rooms: session.meta.rooms || urlParams.rooms,
      adults: session.meta.adults || urlParams.adults,
      children: session.meta.children || urlParams.children,
      infants: session.meta.infants ?? urlParams.infants,
      destinationLabel:
        session.meta.destination || urlParams.destinationLabel || urlParams.destination,
      nights:
        session.meta.nights ||
        nightsBetween(
          session.meta.departDate || urlParams.checkIn,
          session.meta.returnDate || urlParams.checkOut,
        ),
    });
    setMissing(false);
  }, [hotelId, urlParams]);

  function continueToReview(
    rate: HotelRateOption,
    extras?: { priceChanged?: boolean; previousTotalMinor?: number },
  ) {
    if (!hotel) return;
    const totalMinor = rateDisplayMinor(rate, hotel, meta.nights);
    if (!totalMinor) return;
    const priceBreakdown = buildHotelDraftPriceBreakdown(rate, hotel, meta.nights);
    const roomOcc = occupancyFromSearchParams(urlParams);
    saveHotelDraft({
      hotel: {
        id: hotel.id,
        description: hotel.description,
        sellAmountMinor: totalMinor,
        currency: hotel.currency,
        details: hotel.details,
      },
      selectedRate: toDraftHotelRate(rate),
      checkIn: meta.departDate,
      checkOut: meta.returnDate,
      rooms: meta.rooms,
      adults: meta.adults,
      children: meta.children,
      infants: meta.infants,
      childAges: roomOcc.flatMap((r) => r.childAges),
      roomOccupancies: roomOcc.map((r) => ({
        adults: r.adults,
        childAges: r.childAges,
      })),
      location: meta.stayQuery,
      locationLabel: meta.destinationLabel || meta.stayQuery,
      createdAt: new Date().toISOString(),
      inquiryId,
      quoteItemId,
      nights: meta.nights,
      totalMinor: priceBreakdown.payNowMinor || totalMinor,
      priceBreakdown,
      validatedAt: new Date().toISOString(),
      priceChanged: extras?.priceChanged,
      previousTotalMinor: extras?.previousTotalMinor,
      resultsReturnHref: resultsHref,
    });
    router.push("/hotels/book/review");
  }

  if (missing) {
    return (
      <div className="shop-flight-results-error">
        <p>تعذر العثور على الفندق. أعد البحث من صفحة النتائج.</p>
        <Link href={resultsHref || "/hotels/results"} className="shop-btn">
          العودة إلى النتائج
        </Link>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="shop-flight-results-loading">
        <div className="shop-flight-spinner" aria-hidden />
        <p>جاري تحميل تفاصيل الفندق…</p>
      </div>
    );
  }

  return (
    <div className="shop-hotel-detail-page">
      <ShopMockBanner kind="hotel" />
      <HotelDetailModal
        hotel={hotel}
        nights={meta.nights}
        meta={{
          stayQuery: meta.stayQuery,
          departDate: meta.departDate,
          returnDate: meta.returnDate,
          rooms: meta.rooms,
          adults: meta.adults,
          children: meta.children,
          infants: meta.infants,
        }}
        checkRatePath="/shop/checkrate-hotel"
        fetchJson={shopFetch}
        variant="shop"
        onClose={() => router.push(resultsHref)}
        onContinueToReview={continueToReview}
      />
    </div>
  );
}

export default function HotelDetailPage() {
  return (
    <StoreFront wide>
      <Suspense
        fallback={
          <div className="shop-flight-results-loading">
            <div className="shop-flight-spinner" aria-hidden />
            <p>جاري تحميل تفاصيل الفندق…</p>
          </div>
        }
      >
        <HotelDetailInner />
      </Suspense>
    </StoreFront>
  );
}
