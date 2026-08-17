"use client";

import type { HotelRateOption } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";

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
  onOpen: () => void;
};

function formatRating(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  return n >= 10 ? (n / 2).toFixed(1) : n.toFixed(1);
}

export function HotelSearchCard({ hotel, nights, onOpen }: Props) {
  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const rating = formatRating(hotel.details.rating);
  const reviewCount = Number(hotel.details.reviewCount || 0);
  const location = String(
    hotel.details.zoneName ||
      hotel.details.neighborhood ||
      hotel.details.location ||
      hotel.details.address ||
      "—",
  );
  const roomTypes = Array.isArray(hotel.details.rooms)
    ? (hotel.details.rooms as unknown[]).length
    : new Set(hotel.matchingRates.map((r) => r.roomCode || r.roomName)).size;
  const soldOut =
    Number(hotel.details.roomsAvailable) === 0 ||
    hotel.details.scenario === "sold_out" ||
    hotel.details.scenario === "unavailable" ||
    hotel.matchingRates.length === 0;

  const perNightMinor =
    nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;

  return (
    <article className="hotel-search-card">
      <div className="hotel-search-card-media">
        {typeof hotel.details.imageUrl === "string" && hotel.details.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={String(hotel.details.imageUrl)} alt="" />
        ) : (
          <div className={`hotel-search-card-placeholder tone-${(stars % 3) + 1}`} />
        )}
        {soldOut ? <span className="hotel-search-card-badge">غير متاح</span> : null}
      </div>

      <div className="hotel-search-card-main">
        <div className="hotel-search-card-head">
          <div>
            <h3>{name}</h3>
            {stars > 0 ? (
              <div className="hotel-search-card-stars" aria-label={`${stars} نجوم`}>
                {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            ) : null}
          </div>
          {rating ? (
            <div className="hotel-search-card-score">
              <strong>{rating}</strong>
              {reviewCount > 0 ? (
                <small>{reviewCount.toLocaleString("ar")} مراجعة</small>
              ) : null}
            </div>
          ) : null}
        </div>

        <p className="hotel-search-card-location">{location}</p>

        {!soldOut && roomTypes > 0 ? (
          <p className="hotel-search-card-meta">
            {roomTypes} {roomTypes === 1 ? "نوع غرفة" : "أنواع غرف"} ·{" "}
            {hotel.matchingRates.length}{" "}
            {hotel.matchingRates.length === 1 ? "خيار سعر" : "خيارات سعر"}
          </p>
        ) : null}
      </div>

      <div className="hotel-search-card-action">
        {!soldOut ? (
          <>
            <div className="hotel-search-card-price">
              <small>{nights} {nights === 1 ? "ليلة" : "ليالي"} · يبدأ من</small>
              <strong>{formatMoneyMinor(perNightMinor, hotel.currency)}</strong>
              <em>/ ليلة</em>
            </div>
            <button type="button" className="btn hotel-search-card-cta" onClick={onOpen}>
              عرض الغرف والأسعار
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
