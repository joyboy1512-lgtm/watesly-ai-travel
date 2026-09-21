"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import "../../shop.css";
import "../../tvlk-hotel.css";
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
  hotelSearchRequestBody,
  matchShopHotel,
  nightsBetween,
  occupancyFromSearchParams,
  parseHotelResultsSearch,
} from "@/lib/hotel-results-url";
import {
  getHotelSearchSession,
  resolveQuoteItemId,
  type HotelSearchSession,
} from "@/lib/hotel-search-session";
import { shopFetch } from "@/lib/shop-session";
import { humanizeHotelSearchError } from "@/lib/hotel-search-errors";

const HotelDetailModal = dynamic(
  () => import("@/components/hotels/HotelDetailModal").then((m) => m.HotelDetailModal),
  { ssr: false },
);

type HotelRow = HotelOfferRow & {
  matchingRates: HotelRateOption[];
  displayFromMinor: number;
};

function enrichHotel(raw: HotelOfferRow): HotelRow | null {
  return (
    filterHotelOffers([raw], defaultHotelFilters(), "price_asc")[0] || null
  );
}

function sessionStayMatches(
  session: HotelSearchSession,
  params: ReturnType<typeof parseHotelResultsSearch>,
) {
  if (!params.checkIn || !params.checkOut) return true;
  return (
    session.meta.departDate === params.checkIn &&
    session.meta.returnDate === params.checkOut &&
    session.meta.adults === params.adults &&
    session.meta.children === params.children &&
    session.meta.rooms === params.rooms
  );
}

function HotelDetailInner() {
  const router = useRouter();
  const params = useParams<{ hotelId: string }>();
  const searchParams = useSearchParams();
  const hotelId = decodeURIComponent(String(params.hotelId || ""));
  const urlParams = useMemo(() => parseHotelResultsSearch(searchParams), [searchParams]);

  const [hotel, setHotel] = useState<HotelRow | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  const fetchGen = useRef(0);

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
    const gen = ++fetchGen.current;
    const session = getHotelSearchSession();
    const apply = (
      raw: HotelOfferRow,
      extras?: { inquiryId?: string; quoteItemId?: string },
    ) => {
      const enriched = enrichHotel(raw);
      if (!enriched) {
        setMissing(true);
        setLoading(false);
        return;
      }
      setHotel(enriched);
      setInquiryId(extras?.inquiryId);
      setQuoteItemId(extras?.quoteItemId);
      const city =
        String(enriched.details.destinationName || enriched.details.location || "") ||
        urlParams.destination;
      setMeta({
        stayQuery: city || urlParams.destination,
        departDate: urlParams.checkIn || session?.meta.departDate || "",
        returnDate: urlParams.checkOut || session?.meta.returnDate || "",
        rooms: urlParams.rooms || session?.meta.rooms || 1,
        adults: urlParams.adults || session?.meta.adults || 1,
        children: urlParams.children || session?.meta.children || 0,
        infants: urlParams.infants ?? session?.meta.infants ?? 0,
        destinationLabel:
          urlParams.destinationLabel ||
          session?.meta.destination ||
          city ||
          urlParams.destination,
        nights: nightsBetween(
          urlParams.checkIn || session?.meta.departDate || "",
          urlParams.checkOut || session?.meta.returnDate || "",
        ),
      });
      setMissing(false);
      setError("");
      setLoading(false);
    };

    if (session?.hotels?.length && hotelId && sessionStayMatches(session, urlParams)) {
      const raw = matchShopHotel(session.hotels as HotelOfferRow[], hotelId);
      if (raw) {
        apply(raw, {
          inquiryId: session.inquiryId,
          quoteItemId: resolveQuoteItemId(session, raw.id),
        });
        return;
      }
    }

    const checkIn = urlParams.checkIn;
    const checkOut = urlParams.checkOut;
    if (!hotelId || !checkIn || !checkOut) {
      setMissing(true);
      setLoading(false);
      return;
    }

    if (urlParams.children > 0) {
      const occ = occupancyFromSearchParams(urlParams);
      const ages = occ.flatMap((r) => r.childAges);
      if (ages.length < urlParams.children) {
        setError("حدد عمر كل طفل قبل فتح تفاصيل الفندق");
        setMissing(true);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setMissing(false);
    setError("");
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await shopFetch<{
          inquiryId: string;
          quoteItems?: Array<{
            id: string;
            providerOfferRef: string;
            serviceType: string;
          }>;
          hotels: HotelOfferRow[];
        }>("/shop/search-hotels", {
          method: "POST",
          timeoutMs: 60000,
          signal: controller.signal,
          body: JSON.stringify(
            hotelSearchRequestBody(urlParams, { hotelCode: hotelId }),
          ),
        });
        if (gen !== fetchGen.current) return;
        const raw =
          matchShopHotel(result.hotels || [], hotelId) || result.hotels?.[0];
        if (!raw) {
          setMissing(true);
          setLoading(false);
          return;
        }
        apply(raw, {
          inquiryId: result.inquiryId,
          quoteItemId: result.quoteItems?.find(
            (item) =>
              item.providerOfferRef === raw.id && item.serviceType === "hotel",
          )?.id,
        });
      } catch (err) {
        if (gen !== fetchGen.current || controller.signal.aborted) return;
        setError(
          humanizeHotelSearchError(
            err instanceof Error ? err.message : "تعذر جلب تفاصيل الفندق",
          ),
        );
        setMissing(true);
        setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
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
        details: {
          ...hotel.details,
          costAmountMinor: hotel.costAmountMinor,
          validatedAt: new Date().toISOString(),
        },
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

  if (loading) {
    return (
      <div className="shop-flight-results-loading">
        <div className="shop-flight-spinner" aria-hidden />
        <p>جاري تحميل تفاصيل الفندق…</p>
      </div>
    );
  }

  if (missing || !hotel) {
    return (
      <div className="shop-flight-results-error">
        <p>{error || "تعذر العثور على الفندق. أعد البحث من صفحة النتائج."}</p>
        <Link href={resultsHref || "/hotels/results"} className="shop-btn">
          العودة إلى النتائج
        </Link>
      </div>
    );
  }

  return (
    <div className="shop-hotel-detail-page tvlk-hotel">
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
