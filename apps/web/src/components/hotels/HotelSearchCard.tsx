"use client";

import type { HotelRateOption, HotelHighlightBadge } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { HotelLiveBadge } from "./HotelLiveBadge";

type HotelRow = {
  id: string;
  currency: string;
  sellAmountMinor: number;
  displayFromMinor: number;
  matchingRates: HotelRateOption[];
  details: Record<string, unknown>;
};

type Props = {
  hotel: HotelRow;
  nights: number;
  guests?: number;
  rooms?: number;
  variant?: "default" | "shop";
  highlight?: HotelHighlightBadge;
  highlightLabel?: string;
  onOpen: () => void;
};

/** Only show guest ratings when an explicit trusted source is present. */
function guestRatingOf(details: Record<string, unknown>): {
  score: string;
  count?: number;
  source: string;
} | null {
  const score = Number(details.guestRatingScore);
  const source = String(details.guestRatingSource || "").trim();
  if (!Number.isFinite(score) || score <= 0 || !source) return null;
  const scale = Number(details.guestRatingScale || 10) === 5 ? 5 : 10;
  if (score > scale) return null;
  const count = Number(details.guestReviewCount);
  return {
    score: score.toFixed(1),
    count: Number.isFinite(count) && count > 0 ? Math.round(count) : undefined,
    source,
  };
}

export function HotelSearchCard({
  hotel,
  nights,
  guests = 1,
  rooms = 1,
  variant = "default",
  highlight,
  highlightLabel,
  onOpen,
}: Props) {
  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const guest = guestRatingOf(hotel.details);
  const cheapest = hotel.matchingRates[0];
  const location = String(
    hotel.details.zoneName ||
      hotel.details.neighborhood ||
      hotel.details.location ||
      hotel.details.address ||
      "—",
  );
  const mapUrl = typeof hotel.details.mapUrl === "string" ? hotel.details.mapUrl : "";
  const distanceLabel = hotel.details.distanceToCenterLabel
    ? String(hotel.details.distanceToCenterLabel)
    : "";
  const facilities = Array.isArray(hotel.details.facilityLabels)
    ? (hotel.details.facilityLabels as string[]).slice(0, 3)
    : [];
  const soldOut =
    Number(hotel.details.roomsAvailable) === 0 ||
    hotel.details.scenario === "sold_out" ||
    hotel.details.scenario === "unavailable" ||
    hotel.matchingRates.length === 0 ||
    hotel.displayFromMinor <= 0;

  const perNightMinor =
    nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;
  const allotment = cheapest?.allotment;
  const availabilityLabel =
    allotment != null && allotment > 0 && allotment <= 5
      ? `متبقي ${allotment} غرفة`
      : "متاح للحجز";

  const ctaLabel = variant === "shop" ? "عرض الغرف" : "عرض الغرف والأسعار";
  const mapLabel = variant === "shop" ? "عرض على الخريطة" : "الخريطة ↗";
  const isShop = variant === "shop";

  const guestNote = guests === 1 ? "ضيف واحد" : `${guests} ضيوف`;
  const roomNote = rooms === 1 ? "غرفة واحدة" : `${rooms} غرف`;
  const taxesNote =
    cheapest?.taxes?.allIncluded === false ? "ضرائب غير مشمولة" : "شامل الضرائب";

  const sandbox =
    hotel.details.source === "hotelbeds-sandbox" ||
    hotel.details.source === "mock" ||
    hotel.details.liveMode === false;

  if (hotel.displayFromMinor <= 0 && !soldOut) {
    return null;
  }

  return (
    <article className={`hotel-search-card${isShop ? " hotel-search-card-shop" : ""}`}>
      <div className="hotel-search-card-media">
        {typeof hotel.details.imageUrl === "string" && hotel.details.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(hotel.details.imageUrl)} alt={name} loading="lazy" />
        ) : (
          <div className={`hotel-search-card-placeholder tone-${(stars % 3) + 1}`} />
        )}
        {highlight && highlightLabel ? (
          <span className={`hotel-search-card-highlight hotel-highlight-${highlight}`}>
            {highlightLabel}
          </span>
        ) : null}
        {soldOut ? <span className="hotel-search-card-badge">غير متاح</span> : null}
      </div>

      <div className="hotel-search-card-main">
        <div className="hotel-search-card-head">
          <div className="hotel-search-card-title-row">
            <h3>{name}</h3>
            {stars > 0 ? (
              <div className="hotel-search-card-stars" aria-label={`${stars} نجوم`}>
                {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            ) : null}
          </div>
          {!isShop && guest ? (
            <div className="hotel-search-card-score">
              <strong>{guest.score}</strong>
              {guest.count ? <small>{guest.count} مراجعة</small> : null}
            </div>
          ) : null}
        </div>

        <HotelLiveBadge
          compact
          liveMode={!sandbox && Boolean(hotel.details.liveMode)}
          sandbox={sandbox}
          sourceLabel={
            typeof hotel.details.sourceLabel === "string" ? hotel.details.sourceLabel : undefined
          }
          fetchedAt={
            typeof hotel.details.fetchedAt === "string" ? hotel.details.fetchedAt : undefined
          }
        />

        <p className="hotel-search-card-location">
          {location}
          {distanceLabel ? ` · ${distanceLabel} من المركز` : ""}
        </p>

        {isShop && guest ? (
          <div className="hotel-search-card-score hotel-search-card-score-inline">
            <strong>{guest.score}</strong>
            <span>
              {guest.count ? `${guest.count} مراجعة` : guest.source}
            </span>
          </div>
        ) : null}

        {facilities.length ? (
          <ul className="hotel-search-card-poi">
            {facilities.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}

        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hotel-map-link inline"
            onClick={(e) => e.stopPropagation()}
          >
            {mapLabel}
          </a>
        ) : null}

        {!isShop && !soldOut && cheapest ? (
          <p className="hotel-search-card-offer-line">
            <strong>{cheapest.roomName}</strong> · {cheapest.boardName}
          </p>
        ) : null}
      </div>

      <div className="hotel-search-card-action">
        {!soldOut ? (
          <>
            <div className="hotel-search-card-price">
              <small>
                {isShop
                  ? `الإجمالي لـ ${nights} ${nights === 1 ? "ليلة" : "ليالي"} · ${guestNote} · ${roomNote}`
                  : `${nights} ${nights === 1 ? "ليلة" : "ليالي"} · ${cheapest?.roomName || "غرفة"}`}
              </small>
              <strong>
                {formatMoneyMinor(hotel.displayFromMinor, hotel.currency)}
              </strong>
              <em>
                متوسط {formatMoneyMinor(perNightMinor, hotel.currency)} / ليلة · {taxesNote}
              </em>
              <span className="hotel-rooms-left">{availabilityLabel}</span>
              {cheapest?.freeCancellation ? (
                <span className="hotel-rooms-left">إلغاء مجاني</span>
              ) : null}
            </div>
            {isShop && cheapest ? (
              <p className="hotel-search-card-room-below-price">
                <strong>{cheapest.roomName}</strong>
                <span> · {cheapest.boardName}</span>
              </p>
            ) : null}
            <button type="button" className="btn hotel-search-card-cta" onClick={onOpen}>
              {ctaLabel}
            </button>
          </>
        ) : (
          <button type="button" className="btn secondary" disabled>
            غير متاح
          </button>
        )}
      </div>
    </article>
  );
}
