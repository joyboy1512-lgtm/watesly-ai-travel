"use client";

import type { HotelRateOption } from "@/lib/hotel-search";
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
  variant?: "default" | "shop";
  onOpen: () => void;
};

function formatRating(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n >= 10 ? (n / 2).toFixed(1) : n.toFixed(1);
}

export function HotelSearchCard({ hotel, nights, variant = "default", onOpen }: Props) {
  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const rating = formatRating(hotel.details.rating);
  const reviewCount = Number(hotel.details.reviewCount || 0);
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
  const poiDistances = Array.isArray(hotel.details.poiDistances)
    ? (hotel.details.poiDistances as Array<{ nameAr: string; label: string }>)
    : [];
  const soldOut =
    Number(hotel.details.roomsAvailable) === 0 ||
    hotel.details.scenario === "sold_out" ||
    hotel.details.scenario === "unavailable" ||
    hotel.matchingRates.length === 0;

  const perNightMinor =
    nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;
  const roomsLeft =
    cheapest?.allotment ??
    (hotel.details.roomsAvailable != null ? Number(hotel.details.roomsAvailable) : null);

  const ctaLabel = variant === "shop" ? "عرض التوفر" : "عرض الغرف والأسعار";
  const mapLabel = variant === "shop" ? "عرض على الخريطة" : "الخريطة ↗";
  const isShop = variant === "shop";

  return (
    <article className={`hotel-search-card${isShop ? " hotel-search-card-shop" : ""}`}>
      <div className="hotel-search-card-media">
        {typeof hotel.details.imageUrl === "string" && hotel.details.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(hotel.details.imageUrl)} alt="" />
        ) : (
          <div className={`hotel-search-card-placeholder tone-${(stars % 3) + 1}`} />
        )}
        {isShop ? (
          <button type="button" className="hotel-search-card-save" aria-label="حفظ" disabled>
            ♡
          </button>
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
          {!isShop && rating ? (
            <div className="hotel-search-card-score">
              <strong>{rating}</strong>
              {reviewCount > 0 ? (
                <small>{reviewCount.toLocaleString("ar")} مراجعة</small>
              ) : null}
            </div>
          ) : null}
        </div>

        {hotel.details.liveMode || hotel.details.sourceLabel ? (
          <HotelLiveBadge
            compact
            liveMode={Boolean(hotel.details.liveMode)}
            sourceLabel={
              typeof hotel.details.sourceLabel === "string" ? hotel.details.sourceLabel : undefined
            }
            fetchedAt={
              typeof hotel.details.fetchedAt === "string" ? hotel.details.fetchedAt : undefined
            }
          />
        ) : null}

        <p className="hotel-search-card-location">
          {location}
          {distanceLabel ? ` · ${distanceLabel} من المركز` : ""}
        </p>

        {poiDistances.length ? (
          <ul className="hotel-search-card-poi">
            {poiDistances.slice(0, 3).map((poi) => (
              <li key={poi.nameAr}>
                {poi.label} · {poi.nameAr}
              </li>
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
            {isShop && rating ? (
              <div className="hotel-search-card-score hotel-search-card-score-above-price">
                <strong>{rating}</strong>
                {reviewCount > 0 ? (
                  <small>{reviewCount.toLocaleString("ar")} مراجعة</small>
                ) : null}
              </div>
            ) : null}
            <div className="hotel-search-card-price">
              {!isShop ? (
                <small>
                  {nights} {nights === 1 ? "ليلة" : "ليالي"} · {cheapest?.roomName || "غرفة"}
                </small>
              ) : (
                <small>
                  {nights} {nights === 1 ? "ليلة" : "ليالي"}
                </small>
              )}
              <strong>{formatMoneyMinor(hotel.displayFromMinor, hotel.currency)}</strong>
              <em>{formatMoneyMinor(perNightMinor, hotel.currency)} / ليلة</em>
              {roomsLeft != null && roomsLeft > 0 ? (
                <span className="hotel-rooms-left">متبقي {roomsLeft} غرفة</span>
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
