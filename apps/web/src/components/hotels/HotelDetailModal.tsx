"use client";

import { useEffect, useState } from "react";
import "@/app/hotel-rich.css";
import { formatHotelDay, rateDisplayMinor, type HotelRateOption } from "@/lib/hotel-search";
import { type HotelOfferRow } from "@/lib/hotel-search";
import { apiFetch } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import { HotelRoomAccordion } from "./HotelRoomAccordion";
import { HotelBookingSummary } from "./HotelBookingSummary";
import { HotelLiveBadge } from "./HotelLiveBadge";
import { HotelGallery } from "./HotelGallery";
import { TvlkHotelRoomCards } from "./TvlkHotelRoomCards";
import { HotelMediaImage } from "./HotelMediaImage";
import { pickHotelHighlightFacilities } from "@/lib/hotel-facilities";
import { hotelReviewHighlights, guestScoreBand } from "@/lib/hotel-review-highlights";
import {
  shopAdultCount,
  shopChildCount,
  shopNightCount,
  shopRoomCount,
} from "@/lib/hotel-occupancy";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

type StayMeta = {
  stayQuery: string;
  departDate: string;
  returnDate: string;
  rooms: number;
  adults: number;
  children: number;
  infants?: number;
};

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  meta: StayMeta;
  onClose: () => void;
  onEnterGuestData?: (rate: HotelRateOption) => void;
  onCheckout?: (payload: {
    rate: HotelRateOption;
    contact: { name: string; email: string; phone: string };
    specialRequests: string;
    paymentMethod: string;
    travelers: Array<{ firstName: string; lastName: string }>;
  }) => void;
  onContinueToReview?: (
    rate: HotelRateOption,
    extras?: { priceChanged?: boolean; previousTotalMinor?: number },
    allRates?: HotelRateOption[],
  ) => void;
  checkRatePath?: string;
  fetchJson?: typeof apiFetch;
  variant?: "default" | "shop";
};

type CheckRateResponse = {
  available: boolean;
  priceChanged: boolean;
  previousCostMinor?: number;
  offer?: { costAmountMinor?: number; sellAmountMinor?: number };
  selectedRate?: HotelRateOption;
  rateComments?: string;
  pricing?: { sellAmountMinor?: number; costAmountMinor?: number };
};

function formatDay(value?: string) {
  return formatHotelDay(value) || "—";
}

function FacilityIcon({ label }: { label: string }) {
  const common = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true as const };
  if (/wifi|واي/i.test(label)) {
    return (
      <svg {...common}>
        <path d="M12 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-4.2-3.8a6 6 0 0 1 8.4 0M4.8 11.5a10 10 0 0 1 14.4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (/pool|مسبح/i.test(label)) {
    return (
      <svg {...common}>
        <path d="M4 16c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0M5 8h4l2 3h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (/restaurant|مطعم|breakfast|إفطار/i.test(label)) {
    return (
      <svg {...common}>
        <path d="M7 4v8M5 4v5a2 2 0 0 0 4 0V4M16 4v16M14 4h5l-1 6h-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (/parking|موقف/i.test(label)) {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9 16V8h4.2a3 3 0 0 1 0 6H9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }
  if (/gym|نادي|fitness/i.test(label)) {
    return (
      <svg {...common}>
        <path d="M4 10v4M8 8v8M16 8v8M20 10v4M8 12h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (/elevator|مصعد/i.test(label)) {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7l3 3H9l3-3zm0 10-3-3h6l-3 3z" fill="currentColor" />
      </svg>
    );
  }
  if (/24|desk|استقبال|front/i.test(label)) {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 21s-7-4.6-7-11a7 7 0 1 1 14 0c0 6.4-7 11-7 11z" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function HotelDetailModal({
  hotel,
  nights,
  meta,
  onClose,
  onEnterGuestData,
  onCheckout,
  onContinueToReview,
  checkRatePath = "/bookings/checkrate-hotel",
  fetchJson = apiFetch,
  variant = "default",
}: Props) {
  const { locale, t } = useShopCopy();
  const shopStyle = variant === "shop";
  const [descOpen, setDescOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<HotelRateOption | null>(null);
  const [tab, setTab] = useState<"overview" | "photos" | "rooms" | "map" | "reviews" | "facilities" | "policies">(
    shopStyle ? "overview" : "rooms",
  );

  useEffect(() => {
    if (!shopStyle) return;
    const ids = ["overview", "rooms", "map", "facilities", "reviews", "policies"];
    const nodes = ids
      .map((id) => document.getElementById(`tvlk-sec-${id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!nodes.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit?.target.id) return;
        const next = hit.target.id.replace("tvlk-sec-", "") as typeof tab;
        setTab(next);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.12, 0.28, 0.5] },
    );
    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, [shopStyle, hotel.id]);

  const scrollToSection = (id: string) => {
    setTab(id as typeof tab);
    document.getElementById(`tvlk-sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [checkingRateKey, setCheckingRateKey] = useState<string | null>(null);
  const [checkPhase, setCheckPhase] = useState<
    "idle" | "checking" | "confirmed" | "changed" | "soldout" | "error" | "expired"
  >("idle");
  const [checkError, setCheckError] = useState("");
  const [priceChange, setPriceChange] = useState<{ fromMinor: number; toMinor: number } | null>(
    null,
  );
  const [pendingRate, setPendingRate] = useState<HotelRateOption | null>(null);
  const [priceAccepted, setPriceAccepted] = useState(false);

  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const guestScore = Number(hotel.details.guestRatingScore);
  const guestSource = String(hotel.details.guestRatingSource || "").trim();
  const guestRating =
    Number.isFinite(guestScore) && guestScore > 0 && guestSource
      ? {
          score: guestScore,
          count: Number(hotel.details.guestReviewCount) || undefined,
          source: guestSource,
        }
      : null;
  const imageUrl = typeof hotel.details.imageUrl === "string" ? hotel.details.imageUrl : "";
  const mapUrl = typeof hotel.details.mapUrl === "string" ? hotel.details.mapUrl : "";
  const poiDistances = Array.isArray(hotel.details.poiDistances)
    ? (hotel.details.poiDistances as Array<{ nameAr: string; label: string }>)
    : [];
  const facilityLabels = pickHotelHighlightFacilities(
    Array.isArray(hotel.details.facilityLabels)
      ? (hotel.details.facilityLabels as string[])
      : [],
    8,
  );
  const reviewHighlights = hotelReviewHighlights(
    locale,
    Array.isArray(hotel.details.facilityLabels)
      ? (hotel.details.facilityLabels as string[])
      : [],
    6,
  );
  const description =
    typeof hotel.details.description === "string" ? hotel.details.description : "";
  const perNight = nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;
  const lat = Number(hotel.details.latitude);
  const lng = Number(hotel.details.longitude);
  const hasFreeCancel = hotel.matchingRates.some((r) => r.freeCancellation);
  const payHotel = hotel.matchingRates.some((r) => r.paymentType === "AT_HOTEL");
  const payWeb = hotel.matchingRates.some((r) => r.paymentType === "AT_WEB");
  const galleryObjects = Array.isArray(hotel.details.images)
    ? (hotel.details.images as Array<{ url?: string; roomCode?: string; type?: string }>)
        .filter((i) => i.url)
        .map((i) => ({ url: String(i.url), roomCode: i.roomCode, type: i.type }))
    : imageUrl
      ? [{ url: imageUrl }]
      : [];

  async function handleBookRate(rate: HotelRateOption) {
    setCheckError("");
    setPriceChange(null);
    setPendingRate(null);
    setPriceAccepted(false);

    const expMs = hotel.expiresAt ? new Date(hotel.expiresAt).getTime() : NaN;
    if (Number.isFinite(expMs) && expMs <= Date.now()) {
      setCheckPhase("expired");
      setCheckError("انتهت صلاحية هذا العرض المحفوظ. ارجع إلى النتائج وأعد البحث.");
      return;
    }

    setCheckPhase("checking");
    setCheckingRateKey(rate.rateKey);
    try {
      const result = await fetchJson<CheckRateResponse>(checkRatePath, {
        method: "POST",
        timeoutMs: 35000,
        body: JSON.stringify({
          rateKey: rate.rateKey,
          offer: {
            providerKey: String(
              rate.sourceProvider || hotel.details.provider || "hotelbeds",
            ),
            providerOfferRef: hotel.id,
            description: hotel.description,
            costAmountMinor: hotel.costAmountMinor || hotel.sellAmountMinor,
            currency: hotel.currency,
            revalidationToken: JSON.stringify({
              hotelCode: rate.sourceHotelCode || hotel.details.hotelCode,
              rateKey: rate.rateKey,
              rateType: rate.rateType,
              checkIn: hotel.details.checkInDate || meta.departDate,
              checkOut: hotel.details.checkOutDate || meta.returnDate,
            }),
            expiresAt: hotel.expiresAt,
            raw: hotel.details,
          },
        }),
      });
      if (!result.available) {
        setCheckPhase("soldout");
        setCheckError("انتهى التوفر لهذه التعرفة. اختر غرفة أخرى أو أعد البحث.");
        return;
      }
      const nextRate: HotelRateOption = {
        ...rate,
        ...(result.selectedRate || {}),
        rateComments: result.rateComments || result.selectedRate?.rateComments || rate.rateComments,
      };
      if (result.priceChanged) {
        const repricedOffer = result.offer
          ? {
              ...hotel,
              costAmountMinor:
                Number(result.offer.costAmountMinor) || hotel.costAmountMinor,
              sellAmountMinor:
                Number(result.pricing?.sellAmountMinor) || hotel.sellAmountMinor,
            }
          : hotel;
        const toMinor =
          Number(result.pricing?.sellAmountMinor) ||
          (result.selectedRate
            ? rateDisplayMinor(
                { ...rate, ...(result.selectedRate || {}) },
                repricedOffer,
                nights,
              )
            : hotel.displayFromMinor);
        setPriceChange({
          fromMinor: Number(result.previousCostMinor || hotel.sellAmountMinor),
          toMinor,
        });
        setPendingRate(nextRate);
        setCheckPhase("changed");
        return;
      }
      setCheckPhase("confirmed");
      setSelectedRate(nextRate);
    } catch (err) {
      setCheckPhase("error");
      const msg = err instanceof Error ? err.message : "تعذر التحقق من السعر";
      const timedOut = /timeout|abort|timed out|انتهت/i.test(msg);
      setCheckError(
        timedOut
          ? "انتهت مهلة الاتصال بالمزوّد. حاول مرة أخرى أو اختر تعرفة أخرى."
          : msg,
      );
    } finally {
      setCheckingRateKey(null);
    }
  }

  async function handleBookRates(rates: HotelRateOption[]) {
    if (rates.length <= 1) {
      await handleBookRate(rates[0]!);
      return;
    }
    setCheckError("");
    setPriceChange(null);
    setPendingRate(null);
    setPriceAccepted(false);
    const expMs = hotel.expiresAt ? new Date(hotel.expiresAt).getTime() : NaN;
    if (Number.isFinite(expMs) && expMs <= Date.now()) {
      setCheckPhase("expired");
      setCheckError("انتهت صلاحية هذا العرض المحفوظ. ارجع إلى النتائج وأعد البحث.");
      return;
    }
    setCheckPhase("checking");
    const confirmed: HotelRateOption[] = [];
    let previousTotal = 0;
    let changed = false;
    try {
      for (const rate of rates) {
        setCheckingRateKey(rate.rateKey);
        const result = await fetchJson<CheckRateResponse>(checkRatePath, {
          method: "POST",
          timeoutMs: 35000,
          body: JSON.stringify({
            rateKey: rate.rateKey,
            offer: {
              providerKey: String(
                rate.sourceProvider || hotel.details.provider || "hotelbeds",
              ),
              providerOfferRef: hotel.id,
              description: hotel.description,
              costAmountMinor: hotel.costAmountMinor || hotel.sellAmountMinor,
              currency: hotel.currency,
              revalidationToken: JSON.stringify({
                hotelCode: rate.sourceHotelCode || hotel.details.hotelCode,
                rateKey: rate.rateKey,
                rateType: rate.rateType,
                checkIn: hotel.details.checkInDate || meta.departDate,
                checkOut: hotel.details.checkOutDate || meta.returnDate,
              }),
              expiresAt: hotel.expiresAt,
              raw: hotel.details,
            },
          }),
        });
        if (!result.available) {
          setCheckPhase("soldout");
          setCheckError("انتهى التوفر لهذه التعرفة. اختر غرفة أخرى أو أعد البحث.");
          return;
        }
        const nextRate: HotelRateOption = {
          ...rate,
          ...(result.selectedRate || {}),
          rateComments: result.rateComments || result.selectedRate?.rateComments || rate.rateComments,
        };
        confirmed.push(nextRate);
        previousTotal += rateDisplayMinor(rate, hotel, nights);
        if (result.priceChanged) changed = true;
      }
      if (onContinueToReview) {
        onContinueToReview(
          confirmed[0]!,
          changed ? { priceChanged: true, previousTotalMinor: previousTotal } : undefined,
          confirmed,
        );
        return;
      }
      setSelectedRate(confirmed[0]!);
      setCheckPhase("confirmed");
    } catch (err) {
      setCheckPhase("error");
      const msg = err instanceof Error ? err.message : "تعذر التحقق من السعر";
      setCheckError(/timeout|abort|timed out|انتهت/i.test(msg)
        ? "انتهت مهلة الاتصال بالمزوّد. حاول مرة أخرى أو اختر تعرفة أخرى."
        : msg);
    } finally {
      setCheckingRateKey(null);
    }
  }

  function acceptChangedPrice() {
    if (!pendingRate) return;
    setPriceAccepted(true);
    setSelectedRate(pendingRate);
    setCheckPhase("confirmed");
  }

  function rejectChangedPrice() {
    setPendingRate(null);
    setPriceChange(null);
    setPriceAccepted(false);
    setCheckPhase("idle");
    setCheckError("");
  }

  return (
    <div
      className={shopStyle ? "tvlk-hotel-detail" : "flight-modal-backdrop"}
      onClick={shopStyle ? undefined : onClose}
      role={shopStyle ? undefined : "presentation"}
    >
      <div
        className={
          shopStyle
            ? "tvlk-hotel-detail-inner hotel-detail-modal hotel-detail-modal-shop"
            : "flight-modal hotel-detail-modal"
        }
        role={shopStyle ? "region" : "dialog"}
        aria-modal={shopStyle ? undefined : "true"}
        aria-labelledby="hotel-detail-title"
        onClick={shopStyle ? undefined : (e) => e.stopPropagation()}
      >
        {shopStyle ? (
          <nav className="tvlk-hotel-crumb" aria-label={t("backToHotelResults")}>
            <button type="button" onClick={onClose}>
              {t("backToHotelResults")}
            </button>
            <span aria-hidden>/</span>
            <span>{name}</span>
          </nav>
        ) : null}
        {shopStyle && !selectedRate ? (
          <nav className="hotel-detail-tabs hotel-detail-tabs-sticky" aria-label="أقسام الفندق">
            {(
              [
                ["overview", t("hotelOverview")],
                ["rooms", t("roomsAndPrices")],
                ["map", t("hotelLocationSec")],
                ["facilities", t("facilities")],
                ["reviews", t("hotelReviewsSec")],
                ["policies", t("hotelPoliciesSec")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "on" : undefined}
                onClick={() => scrollToSection(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : null}
        {shopStyle ? null : (
        <div className="hotel-modal-sticky-head">
            <div className="hotel-modal-toolbar">
              <button type="button" className="flight-modal-close" aria-label="إغلاق" onClick={onClose}>
                ×
              </button>
            </div>

          <div className="hotel-name-chip" title={name}>
            <h2 id="hotel-detail-title">{name}</h2>
            {stars > 0 ? (
              <div className="hotel-gold-stars" aria-label={`${stars} نجوم`}>
                {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        )}

        <div className="hotel-modal-live">
          <HotelLiveBadge
            liveMode={Boolean(hotel.details.liveMode)}
            sandbox={
              hotel.details.source === "hotelbeds-sandbox" ||
              hotel.details.source === "mock" ||
              hotel.details.liveMode === false ||
              String(hotel.details.sourceLabel || "").includes("Sandbox") ||
              String(hotel.details.sourceLabel || "").includes("تجريب")
            }
            sourceLabel={
              typeof hotel.details.sourceLabel === "string"
                ? hotel.details.sourceLabel
                : undefined
            }
            fetchedAt={
              typeof hotel.details.fetchedAt === "string" ? hotel.details.fetchedAt : undefined
            }
            expiresAt={hotel.expiresAt}
          />
        </div>

        {checkPhase === "checking" ? (
          <div className="hotel-recheck-banner is-checking" role="status">
            جاري التحقق من السعر والتوفر لدى المزوّد…
          </div>
        ) : null}
        {checkPhase === "confirmed" && selectedRate ? (
          <div className="hotel-recheck-banner is-ok" role="status">
            تم التحقق من السعر الآن
          </div>
        ) : null}
        {checkPhase === "changed" && priceChange && pendingRate ? (
          <div className="hotel-recheck-banner is-changed" role="alertdialog" aria-labelledby="price-change-title">
            <strong id="price-change-title">تغيّر السعر بعد التحقق</strong>
            <p>
              السابق: <s>{formatMoneyMinor(priceChange.fromMinor, hotel.currency)}</s>
              {" → "}
              الجديد: <strong>{formatMoneyMinor(priceChange.toMinor, hotel.currency)}</strong>
            </p>
            <div className="hotel-recheck-actions">
              <button type="button" className="btn" onClick={acceptChangedPrice}>
                الموافقة والمتابعة بالسعر الجديد
              </button>
              <button type="button" className="btn secondary" onClick={rejectChangedPrice}>
                العودة واختيار عرض آخر
              </button>
            </div>
          </div>
        ) : null}
        {checkPhase === "soldout" || checkPhase === "expired" ? (
          <div className="hotel-recheck-banner is-soldout" role="alert">
            {checkError || "انتهى التوفر لهذه التعرفة"}
            <div className="hotel-recheck-actions">
              <button type="button" className="btn secondary" onClick={onClose}>
                العودة إلى النتائج
              </button>
            </div>
          </div>
        ) : null}
        {checkPhase === "error" && checkError ? (
          <div className="hotel-recheck-banner is-soldout" role="alert">
            {checkError}
            <div className="hotel-recheck-actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCheckPhase("idle");
                  setCheckError("");
                }}
              >
                حسناً
              </button>
            </div>
          </div>
        ) : null}

        {selectedRate ? (
          <HotelBookingSummary
            hotel={hotel}
            rate={selectedRate}
            nights={nights}
            meta={meta}
            priceChange={priceAccepted ? priceChange : priceChange}
            shopStyle={shopStyle}
            onBack={() => {
              setSelectedRate(null);
              setPriceChange(null);
              setPendingRate(null);
              setPriceAccepted(false);
              setCheckPhase("idle");
            }}
            onEnterGuestData={() => onEnterGuestData?.(selectedRate)}
            onCheckout={onCheckout}
            onContinueToReview={
              shopStyle && onContinueToReview
                ? () =>
                    onContinueToReview(selectedRate, {
                      priceChanged: Boolean(priceChange),
                      previousTotalMinor: priceChange?.fromMinor,
                    })
                : undefined
            }
          />
        ) : (
          <>
            {!shopStyle && galleryObjects.length > 0 ? (
              <HotelGallery
                images={galleryObjects}
                hotelName={name}
                heroUrl={imageUrl || undefined}
              />
            ) : null}

            {shopStyle ? null : (
            <div className={`hotel-detail-modal-hero${galleryObjects.length ? " no-photo" : ""}`}>
              {galleryObjects.length === 0 ? (
                <HotelMediaImage
                  src={imageUrl}
                  alt={name}
                  className="hotel-detail-modal-photo"
                  compactEmpty
                />
              ) : null}
              <div className="hotel-detail-modal-summary">
                <p>
                  {formatDay(meta.departDate)} → {formatDay(meta.returnDate)} ·{" "}
                  {shopNightCount(locale, nights)}
                </p>
                <p>
                  {shopRoomCount(locale, meta.rooms)} · {shopAdultCount(locale, meta.adults)}
                  {meta.children ? ` · ${shopChildCount(locale, meta.children)}` : ""}
                </p>
                {hotel.details.distanceToCenterLabel ? (
                  <p className="hotel-detail-distance">
                    {String(hotel.details.distanceToCenterLabel)} من مركز {meta.stayQuery}
                  </p>
                ) : null}
                {poiDistances.length ? (
                  <ul className="hotel-detail-poi-list">
                    {poiDistances.slice(0, 4).map((poi) => (
                      <li key={poi.nameAr}>
                        {poi.label} · {poi.nameAr}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {guestRating ? (
                  <p className="hotel-detail-rating">
                    تقييم الضيوف {guestRating.score.toFixed(1)}
                    {guestRating.count ? ` · ${guestRating.count} مراجعة` : ""}
                    {" · "}
                    {guestRating.source}
                  </p>
                ) : null}
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hotel-map-link">
                    عرض على الخريطة ↗
                  </a>
                ) : null}
              </div>
              <div className="hotel-detail-from">
                <small>يبدأ من</small>
                <strong>{formatMoneyMinor(perNight, hotel.currency)}</strong>
                <em>/ ليلة · دون ضريبة المدينة</em>
                <span>{formatMoneyMinor(hotel.displayFromMinor, hotel.currency)} إجمالي الإقامة</span>
              </div>
            </div>
            )}

            {!shopStyle && description ? (
              <section className="flight-modal-section hotel-desc-section">
                <h3>عن الفندق</h3>
                <p className={descOpen ? "hotel-detail-desc is-open" : "hotel-detail-desc is-clamp"}>
                  {description}
                </p>
                {description.length > 90 ? (
                  <button
                    type="button"
                    className="hotel-desc-more"
                    onClick={() => setDescOpen((v) => !v)}
                  >
                    {descOpen ? "عرض أقل" : "عرض المزيد"}
                  </button>
                ) : null}
              </section>
            ) : null}

            {shopStyle ? null : (
            <nav className="hotel-detail-tabs hotel-detail-tabs-sticky" aria-label="أقسام الفندق">
              {(
                  [
                      ["photos", "الصور"],
                      ["rooms", "الغرف والأسعار"],
                      ["map", "الموقع"],
                      ["facilities", "المرافق"],
                      ["reviews", "التقييمات"],
                      ["policies", "السياسات"],
                    ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? "on" : undefined}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
            )}

            {checkError && checkPhase === "idle" ? (
              <p className="hotel-check-error">{checkError}</p>
            ) : null}

            {shopStyle ? (
              <section id="tvlk-sec-overview" className="tvlk-overview tvlk-hotel-section">
                {galleryObjects.length > 0 ? (
                  <HotelGallery
                    images={galleryObjects}
                    hotelName={name}
                    heroUrl={imageUrl || undefined}
                    seeAllLabel={t("seeAllPhotos")}
                  />
                ) : (
                  <HotelMediaImage
                    src={imageUrl}
                    alt={name}
                    className="hotel-detail-modal-photo"
                    compactEmpty
                  />
                )}
                <div className="tvlk-overview-card">
                  <header className="tvlk-overview-head">
                    <div className="hotel-name-chip" title={name}>
                      <h2 id="hotel-detail-title">{name}</h2>
                      <p className="tvlk-overview-type">
                        {t("typeHotel")}
                        {stars > 0 ? (
                          <span className="hotel-gold-stars" aria-label={`${stars} نجوم`}>
                            {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div className="tvlk-overview-price">
                      <small>{t("priceRoomNightFrom")}</small>
                      <strong>{formatMoneyMinor(perNight, hotel.currency)}</strong>
                      <button
                        type="button"
                        className="btn hotel-choose-room-cta"
                        onClick={() => scrollToSection("rooms")}
                      >
                        {t("chooseYourRoom")}
                      </button>
                    </div>
                  </header>
                  <div className="tvlk-overview-cols">
                    <div className="tvlk-overview-col">
                      {guestRating ? (
                        <button
                          type="button"
                          className="tvlk-overview-score"
                          onClick={() => scrollToSection("reviews")}
                        >
                          <strong>
                            {guestRating.score.toFixed(1)}
                            <em>/{hotel.details.guestRatingScale === 5 ? 5 : 10}</em>
                          </strong>
                          <span>
                            <b>{t(guestScoreBand(guestRating.score, hotel.details.guestRatingScale === 5 ? 5 : 10))}</b>
                            {guestRating.count ? (
                              <small>{t("basedOnReviews", { n: guestRating.count })}</small>
                            ) : (
                              <small>{guestRating.source}</small>
                            )}
                          </span>
                        </button>
                      ) : (
                        <p className="tvlk-overview-muted">{t("noGuestReviews")}</p>
                      )}
                      {reviewHighlights.length ? (
                        <>
                          <h3>{t("whatGuestsSay")}</h3>
                          <ul className="tvlk-overview-quotes">
                            {reviewHighlights.slice(0, 4).map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                    <div className="tvlk-overview-col">
                      <div className="tvlk-overview-col-head">
                        <h3>{t("inTheArea")}</h3>
                        {mapUrl ? (
                          <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                            {t("seeMap")}
                          </a>
                        ) : (
                          <button type="button" onClick={() => scrollToSection("map")}>
                            {t("seeMap")}
                          </button>
                        )}
                      </div>
                      <p className="tvlk-overview-address">
                        {[
                          hotel.details.address ? String(hotel.details.address) : "",
                          String(hotel.details.zoneName || hotel.details.neighborhood || ""),
                          String(hotel.details.destinationName || hotel.details.location || meta.stayQuery),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      {poiDistances.length ? (
                        <ul className="tvlk-overview-poi">
                          {poiDistances.slice(0, 8).map((poi) => (
                            <li key={poi.nameAr}>
                              <span>{poi.nameAr}</span>
                              <em>{poi.label}</em>
                            </li>
                          ))}
                        </ul>
                      ) : hotel.details.distanceToCenterLabel ? (
                        <p className="tvlk-overview-muted">
                          {String(hotel.details.distanceToCenterLabel)} من مركز {meta.stayQuery}
                        </p>
                      ) : null}
                    </div>
                    <div className="tvlk-overview-col">
                      <div className="tvlk-overview-col-head">
                        <h3>{t("mainFacilities")}</h3>
                        <button type="button" onClick={() => scrollToSection("facilities")}>
                          {t("seeMoreLink")}
                        </button>
                      </div>
                      {facilityLabels.length ? (
                        <ul className="tvlk-overview-facilities">
                          {facilityLabels.slice(0, 6).map((f) => (
                            <li key={f}>
                              <FacilityIcon label={f} />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                  {description ? (
                    <div className="tvlk-overview-about">
                      <p className={descOpen ? "hotel-detail-desc is-open" : "hotel-detail-desc is-clamp"}>
                        {description}
                      </p>
                      {description.length > 90 ? (
                        <button
                          type="button"
                          className="hotel-desc-more"
                          onClick={() => setDescOpen((v) => !v)}
                        >
                          {descOpen ? t("showLess") : t("seeMoreLink")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {tab === "photos" ? (
              <section className="flight-modal-section hotel-tab-panel">
                <HotelGallery
                  images={
                    Array.isArray(hotel.details.images)
                      ? (hotel.details.images as Array<{ url?: string; roomCode?: string; type?: string }>)
                          .filter((img) => img.url)
                          .map((img) => ({
                            url: String(img.url),
                            roomCode: img.roomCode,
                            type: img.type,
                          }))
                      : []
                  }
                  hotelName={name}
                  heroUrl={
                    typeof hotel.details.imageUrl === "string" ? hotel.details.imageUrl : undefined
                  }
                />
              </section>
            ) : null}

            {shopStyle || tab === "rooms" ? (
              <section
                id="tvlk-sec-rooms"
                className="flight-modal-section hotel-detail-rooms-section tvlk-hotel-section"
              >
                {shopStyle ? (
                  <TvlkHotelRoomCards
                    hotel={hotel}
                    nights={nights}
                    neededRooms={meta.rooms}
                    checkingRateKey={checkingRateKey}
                    onBookRate={(rate) => void handleBookRate(rate)}
                    onBookRates={(rates) => void handleBookRates(rates)}
                  />
                ) : (
                  <HotelRoomAccordion
                    hotel={hotel}
                    nights={nights}
                    checkingRateKey={checkingRateKey}
                    shopStyle={shopStyle}
                    onBookRate={(rate) => void handleBookRate(rate)}
                  />
                )}
              </section>
            ) : null}

            {shopStyle || tab === "map" ? (
              <section id="tvlk-sec-map" className="flight-modal-section hotel-tab-panel tvlk-hotel-section">
                <h3>موقع الفندق</h3>
                {hotel.details.address ? (
                  <p>{String(hotel.details.address)}</p>
                ) : null}
                {poiDistances.length ? (
                  <ul className="hotel-detail-poi-list">
                    {poiDistances.map((poi) => (
                      <li key={poi.nameAr}>
                        {poi.label} · {poi.nameAr}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {lat != null && lng != null ? (
                  <iframe
                    className="hotel-map-embed"
                    title="خريطة الفندق"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`}
                  />
                ) : null}
                {mapUrl ? (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hotel-map-link">
                    فتح الخريطة بحجم أكبر ↗
                  </a>
                ) : (
                  <p className="hint">إحداثيات الموقع غير متوفرة من المزود.</p>
                )}
              </section>
            ) : null}

            {shopStyle || tab === "reviews" ? (
              <section id="tvlk-sec-reviews" className="flight-modal-section hotel-tab-panel tvlk-hotel-section">
                <h3>{t("reviewScoreLabel")}</h3>
                {guestRating ? (
                  <div className="hotel-review-score">
                    <strong>{guestRating.score.toFixed(1)}</strong>
                    <div>
                      <span>{t(guestScoreBand(guestRating.score))}</span>
                      <span>{t("reviewsFromSource", { source: guestRating.source })}</span>
                      {guestRating.count ? (
                        <small>{t("basedOnReviews", { n: guestRating.count })}</small>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="hint">
                    لا يتوفر تقييم نزلاء موثوق من المزود لهذا العقار. يُعرض تصنيف النجوم الرسمي فقط.
                  </p>
                )}
                {reviewHighlights.length ? (
                  <>
                    <h4 className="hotel-review-subhead">{t("reviewHighlights")}</h4>
                    <ul className="hotel-facility-chips">
                      {reviewHighlights.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {galleryObjects.length > 1 ? (
                  <>
                    <h4 className="hotel-review-subhead">{t("reviewPhotos")}</h4>
                    <div className="hotel-review-photos">
                      {galleryObjects.slice(0, 8).map((img) => (
                        <HotelMediaImage
                          key={img.url}
                          src={img.url}
                          alt={name}
                          className="hotel-review-photo"
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {shopStyle || tab === "facilities" ? (
              <section id="tvlk-sec-facilities" className="flight-modal-section hotel-tab-panel tvlk-hotel-section">
                <h3>المرافق</h3>
                {facilityLabels.length ? (
                  <ul className="hotel-facility-chips">
                    {facilityLabels.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="hint">لم تُرجع Hotelbeds مرافق مفصّلة لهذا الفندق.</p>
                )}
              </section>
            ) : null}

            {shopStyle || tab === "policies" ? (
              <section id="tvlk-sec-policies" className="flight-modal-section hotel-tab-panel tvlk-hotel-section">
                <h3>سياسات مكان الإقامة</h3>
                <ul className="hotel-policy-list">
                  <li>
                    <strong>تسجيل الوصول</strong>
                    <span>{formatDay(meta.departDate)} · حسب سياسة الفندق المحلية</span>
                  </li>
                  <li>
                    <strong>تسجيل المغادرة</strong>
                    <span>{formatDay(meta.returnDate)}</span>
                  </li>
                  <li>
                    <strong>الإلغاء</strong>
                    <span>
                      {hasFreeCancel
                        ? "توجد تعرفات بإلغاء مجاني — راجع تفاصيل كل غرفة"
                        : "معظم التعرفات غير قابلة للاسترداد — راجع تفاصيل كل سعر"}
                    </span>
                  </li>
                  <li>
                    <strong>الدفع</strong>
                    <span>
                      {payHotel && payWeb
                        ? "يتوفر الدفع أونلاين أو في الفندق حسب التعرفة"
                        : payHotel
                          ? "الدفع في الفندق عند الوصول"
                          : "الدفع أونلاين عند الحجز"}
                    </span>
                  </li>
                  <li>
                    <strong>الوجبات</strong>
                    <span>
                      {Array.isArray(hotel.details.boards)
                        ? (hotel.details.boards as string[]).join(" · ")
                        : "حسب نوع الغرفة المختارة"}
                    </span>
                  </li>
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
