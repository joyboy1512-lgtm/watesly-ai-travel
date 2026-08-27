"use client";

import { useState } from "react";
import "@/app/hotel-rich.css";
import { formatHotelDay, rateDisplayMinor, type HotelRateOption } from "@/lib/hotel-search";
import { type HotelOfferRow } from "@/lib/hotel-search";
import { apiFetch } from "@/lib/api";
import { formatMoneyMinor } from "@/lib/format";
import { HotelRoomAccordion } from "./HotelRoomAccordion";
import { HotelBookingSummary } from "./HotelBookingSummary";
import { HotelLiveBadge } from "./HotelLiveBadge";
import { HotelGallery } from "./HotelGallery";
import { HotelMediaImage } from "./HotelMediaImage";
import { pickHotelHighlightFacilities } from "@/lib/hotel-facilities";
import {
  arabicAdultCount,
  arabicChildCount,
  arabicNightCount,
  arabicRoomCount,
} from "@/lib/hotel-occupancy";

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
  ) => void;
  checkRatePath?: string;
  fetchJson?: typeof apiFetch;
  variant?: "default" | "shop";
};

type CheckRateResponse = {
  available: boolean;
  priceChanged: boolean;
  previousCostMinor?: number;
  selectedRate?: HotelRateOption;
  rateComments?: string;
};

function formatDay(value?: string) {
  return formatHotelDay(value) || "—";
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
  const shopStyle = variant === "shop";
  const [descOpen, setDescOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<HotelRateOption | null>(null);
  const [tab, setTab] = useState<"photos" | "rooms" | "map" | "reviews" | "facilities" | "policies">(
    "rooms",
  );
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
            providerKey: String(hotel.details.provider || "hotelbeds"),
            providerOfferRef: hotel.id,
            description: hotel.description,
            costAmountMinor: hotel.costAmountMinor || hotel.sellAmountMinor,
            currency: hotel.currency,
            revalidationToken: JSON.stringify({
              hotelCode: hotel.details.hotelCode,
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
        const toMinor = result.selectedRate
          ? rateDisplayMinor(
              { ...rate, ...(result.selectedRate || {}) },
              hotel,
              nights,
            )
          : hotel.displayFromMinor;
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
    <div className="flight-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`flight-modal hotel-detail-modal${shopStyle ? " hotel-detail-modal-shop" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
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
          {shopStyle ? (
            <div className="hotel-modal-sticky-meta">
              <p>
                {[
                  String(hotel.details.destinationName || hotel.details.location || ""),
                  String(hotel.details.zoneName || hotel.details.neighborhood || ""),
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              <div className="hotel-modal-sticky-price">
                <strong>{formatMoneyMinor(hotel.displayFromMinor, hotel.currency)}</strong>
                <small>التكلفة الكلية · يبدأ من</small>
                <button
                  type="button"
                  className="btn hotel-choose-room-cta"
                  onClick={() => setTab("rooms")}
                >
                  اختر غرفتك
                </button>
              </div>
            </div>
          ) : null}
        </div>

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
            {galleryObjects.length > 0 ? (
              <HotelGallery
                images={galleryObjects}
                hotelName={name}
                heroUrl={imageUrl || undefined}
              />
            ) : null}

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
                  {arabicNightCount(nights)}
                </p>
                <p>
                  {arabicRoomCount(meta.rooms)} · {arabicAdultCount(meta.adults)}
                  {meta.children ? ` · ${arabicChildCount(meta.children)}` : ""}
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
              <div className={`hotel-detail-from${shopStyle ? " hotel-detail-from-shop" : ""}`}>
                <small>يبدأ من</small>
                <strong>{formatMoneyMinor(perNight, hotel.currency)}</strong>
                <em>/ ليلة</em>
                <span>{formatMoneyMinor(hotel.displayFromMinor, hotel.currency)} إجمالي</span>
              </div>
            </div>

            {description ? (
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

            {checkError && checkPhase === "idle" ? (
              <p className="hotel-check-error">{checkError}</p>
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

            {tab === "rooms" ? (
              <section className="flight-modal-section hotel-detail-rooms-section">
                <HotelRoomAccordion
                  hotel={hotel}
                  nights={nights}
                  checkingRateKey={checkingRateKey}
                  shopStyle={shopStyle}
                  onBookRate={(rate) => void handleBookRate(rate)}
                />
              </section>
            ) : null}

            {tab === "map" ? (
              <section className="flight-modal-section hotel-tab-panel">
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

            {tab === "reviews" ? (
              <section className="flight-modal-section hotel-tab-panel">
                <h3>التقييمات</h3>
                {guestRating ? (
                  <div className="hotel-review-score">
                    <strong>{guestRating.score.toFixed(1)}</strong>
                    <div>
                      <span>مصدر: {guestRating.source}</span>
                      {guestRating.count ? (
                        <small>{guestRating.count} مراجعة</small>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="hint">
                    لا يتوفر تقييم نزلاء موثوق من المزود لهذا العقار. يُعرض تصنيف النجوم الرسمي فقط.
                  </p>
                )}
              </section>
            ) : null}

            {tab === "facilities" ? (
              <section className="flight-modal-section hotel-tab-panel">
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

            {tab === "policies" ? (
              <section className="flight-modal-section hotel-tab-panel">
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
