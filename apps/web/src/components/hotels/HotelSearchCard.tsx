"use client";

import { translateRoomNameAr } from "@watesly-travel/shared";
import type { HotelRateOption, HotelHighlightBadge } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { HotelLiveBadge } from "./HotelLiveBadge";
import { HotelMediaImage } from "./HotelMediaImage";
import { HotelPricePanel } from "./HotelPricePanel";
import { buildHotelDraftPriceBreakdown } from "@/lib/hotel-draft-price";
import { pickHotelHighlightFacilities } from "@/lib/hotel-facilities";
import {
  arabicGuestCount,
  arabicNightCount,
  arabicRoomCount,
} from "@/lib/hotel-occupancy";

type HotelRow = {
  id: string;
  description?: string;
  currency: string;
  sellAmountMinor: number;
  costAmountMinor?: number;
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
  const city = String(
    hotel.details.destinationName || hotel.details.location || "",
  ).trim();
  const zone = String(
    hotel.details.zoneName || hotel.details.neighborhood || "",
  ).trim();
  const locationParts = [city, zone].filter(Boolean);
  const location =
    locationParts.length > 0
      ? locationParts.join(" · ")
      : String(hotel.details.address || "—");
  const mapUrl = typeof hotel.details.mapUrl === "string" ? hotel.details.mapUrl : "";
  const distanceLabel = hotel.details.distanceToCenterLabel
    ? String(hotel.details.distanceToCenterLabel)
    : "";
  const poiDistances = Array.isArray(hotel.details.poiDistances)
    ? (hotel.details.poiDistances as Array<{ label?: string; distanceKm?: number }>)
    : [];
  const landmarkHint = poiDistances[0]?.label
    ? `${poiDistances[0].label}${
        poiDistances[0].distanceKm != null
          ? ` · ${Number(poiDistances[0].distanceKm).toFixed(1)} كم`
          : ""
      }`
    : "";
  const imageUrl =
    typeof hotel.details.imageUrl === "string" ? hotel.details.imageUrl : "";
  const galleryUrls = Array.isArray(hotel.details.images)
    ? (hotel.details.images as Array<{ url?: string } | string>)
        .map((img) => (typeof img === "string" ? img : img.url || ""))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  if (imageUrl && !galleryUrls.includes(imageUrl)) {
    galleryUrls.unshift(imageUrl);
  }
  const facilities = pickHotelHighlightFacilities(
    Array.isArray(hotel.details.facilityLabels)
      ? (hotel.details.facilityLabels as string[])
      : [],
    4,
  );
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

  const guestNote = arabicGuestCount(guests);
  const roomNote = arabicRoomCount(rooms);
  const nightsNote = arabicNightCount(nights);
  const roomNameAr = cheapest ? translateRoomNameAr(cheapest.roomName).ar : "غرفة";
  const taxesNote =
    cheapest?.taxes?.allIncluded === false ? "ضرائب غير مشمولة" : "شامل الضرائب";
  const priceBreakdown =
    cheapest && hotel.displayFromMinor > 0
      ? buildHotelDraftPriceBreakdown(
          cheapest,
          {
            id: hotel.id,
            description: hotel.description || String(hotel.details.name || "فندق"),
            sellAmountMinor: hotel.sellAmountMinor,
            costAmountMinor: hotel.costAmountMinor,
            currency: hotel.currency,
            details: hotel.details,
          },
          nights,
        )
      : null;

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
        <HotelMediaImage
          src={imageUrl || galleryUrls[0]}
          alt={name}
          preferMedium
          className="hotel-search-card-photo"
        />
        {galleryUrls.length > 1 ? (
          <div className="hotel-search-card-thumbs" aria-hidden>
            {galleryUrls.slice(0, 4).map((src) => (
              <HotelMediaImage
                key={src}
                src={src}
                alt=""
                preferMedium
                className="hotel-search-card-thumb"
              />
            ))}
          </div>
        ) : null}
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
          {landmarkHint ? ` · قرب ${landmarkHint}` : ""}
        </p>

        <div className="hotel-search-card-badges">
          {cheapest?.freeCancellation ? (
            <span className="hotel-chip good">إلغاء مجاني</span>
          ) : null}
          {cheapest && /^(BB|HB|FB|AI)/i.test(String(cheapest.boardCode || "")) ? (
            <span className="hotel-chip">شامل الإفطار</span>
          ) : null}
          {allotment != null && allotment > 0 && allotment <= 5 ? (
            <span className="hotel-chip warn">متبقي {allotment} غرفة</span>
          ) : null}
        </div>

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
                  ? `${nightsNote} · ${guestNote} · ${roomNote}`
                  : `${nightsNote} · ${roomNameAr}`}
              </small>
              {priceBreakdown ? (
                <HotelPricePanel
                  currency={hotel.currency}
                  nights={nights}
                  breakdown={priceBreakdown}
                  variant="card"
                />
              ) : (
                <>
                  <strong>{formatMoneyMinor(hotel.displayFromMinor, hotel.currency)}</strong>
                  <em>
                    متوسط {formatMoneyMinor(perNightMinor, hotel.currency)} / ليلة · {taxesNote}
                  </em>
                </>
              )}
              <span className="hotel-rooms-left">{availabilityLabel}</span>
              {cheapest?.freeCancellation ? (
                <span className="hotel-rooms-left">إلغاء مجاني</span>
              ) : null}
            </div>
            {isShop && cheapest ? (
              <p className="hotel-search-card-room-below-price">
                <strong>{roomNameAr}</strong>
                {cheapest.roomName && cheapest.roomName !== roomNameAr ? (
                  <small> ({cheapest.roomName})</small>
                ) : null}{" "}
                · {cheapest.boardName}
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
