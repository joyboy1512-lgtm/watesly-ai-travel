"use client";

import type { HotelRateOption } from "@/lib/hotel-search";
import { rateDisplayMinor, type HotelOfferRow } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { HotelRoomAccordion } from "./HotelRoomAccordion";

type StayMeta = {
  stayQuery: string;
  departDate: string;
  returnDate: string;
  rooms: number;
  adults: number;
  children: number;
};

type Props = {
  hotel: HotelOfferRow & { matchingRates: HotelRateOption[]; displayFromMinor: number };
  nights: number;
  meta: StayMeta;
  onClose: () => void;
  onBookRate: (rate: HotelRateOption) => void;
};

function formatDay(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("ar-SA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

export function HotelDetailModal({ hotel, nights, meta, onClose, onBookRate }: Props) {
  const name = String(hotel.details.name || "فندق");
  const stars = Number(hotel.details.stars || 0);
  const rating = hotel.details.rating ? Number(hotel.details.rating) : 0;
  const imageUrl = typeof hotel.details.imageUrl === "string" ? hotel.details.imageUrl : "";
  const mapUrl = typeof hotel.details.mapUrl === "string" ? hotel.details.mapUrl : "";
  const poiDistances = Array.isArray(hotel.details.poiDistances)
    ? (hotel.details.poiDistances as Array<{ nameAr: string; label: string }>)
    : [];
  const facilityLabels = Array.isArray(hotel.details.facilityLabels)
    ? (hotel.details.facilityLabels as string[])
    : [];
  const perNight = nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;

  return (
    <div className="flight-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="flight-modal hotel-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flight-modal-head">
          <div>
            <h2 id="hotel-detail-title">{name}</h2>
            {stars > 0 ? (
              <div className="hotel-search-card-stars">
                {Array.from({ length: Math.min(5, stars) }, (_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
            ) : null}
          </div>
          <button type="button" className="flight-modal-close" aria-label="إغلاق" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="hotel-detail-modal-hero">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="hotel-detail-modal-photo" />
          ) : (
            <div className={`hotel-detail-hero-placeholder tone-${(stars % 3) + 1}`} />
          )}
          <div className="hotel-detail-modal-summary">
            <p>
              {formatDay(meta.departDate)} → {formatDay(meta.returnDate)} · {nights}{" "}
              {nights === 1 ? "ليلة" : "ليالي"}
            </p>
            <p>
              {meta.rooms} غرفة · {meta.adults} بالغ
              {meta.children ? ` · ${meta.children} طفل` : ""}
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
            {rating > 0 ? (
              <p className="hotel-detail-rating">
                تقييم {rating.toFixed(1)}/10
                {hotel.details.ranking ? ` · Hotelbeds ${String(hotel.details.ranking)}/100` : ""}
              </p>
            ) : null}
            {mapUrl ? (
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="hotel-map-link">
                عرض على الخريطة ↗
              </a>
            ) : null}
            <div className="hotel-detail-from">
              <small>يبدأ من</small>
              <strong>{formatMoneyMinor(perNight, hotel.currency)}</strong>
              <em>/ ليلة · {formatMoneyMinor(hotel.displayFromMinor, hotel.currency)} إجمالي</em>
            </div>
          </div>
        </div>

        {typeof hotel.details.description === "string" && hotel.details.description ? (
          <section className="flight-modal-section">
            <h3>عن الفندق</h3>
            <p className="hotel-detail-desc">{hotel.details.description}</p>
          </section>
        ) : null}

        {facilityLabels.length ? (
          <section className="flight-modal-section">
            <h3>مرافق الفندق</h3>
            <ul className="hotel-facility-chips">
              {facilityLabels.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flight-modal-section hotel-detail-rooms-section">
          <HotelRoomAccordion hotel={hotel} nights={nights} onBookRate={onBookRate} />
        </section>
      </div>
    </div>
  );
}
