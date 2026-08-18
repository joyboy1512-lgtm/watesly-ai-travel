"use client";

import { useState } from "react";
import type { HotelRateOption } from "@/lib/hotel-search";
import { type HotelOfferRow } from "@/lib/hotel-search";
import { formatMoneyMinor } from "@/lib/format";
import { HotelRoomAccordion } from "./HotelRoomAccordion";
import { HotelBookingSummary } from "./HotelBookingSummary";

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
  onEnterGuestData: (rate: HotelRateOption) => void;
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

export function HotelDetailModal({ hotel, nights, meta, onClose, onEnterGuestData }: Props) {
  const [descOpen, setDescOpen] = useState(false);
  const [selectedRate, setSelectedRate] = useState<HotelRateOption | null>(null);
  const [tab, setTab] = useState<"rooms" | "map" | "reviews" | "facilities" | "policies">(
    "rooms",
  );

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
  const description =
    typeof hotel.details.description === "string" ? hotel.details.description : "";
  const perNight = nights > 0 ? Math.round(hotel.displayFromMinor / nights) : hotel.displayFromMinor;
  const lat = Number(hotel.details.latitude);
  const lng = Number(hotel.details.longitude);
  const hasFreeCancel = hotel.matchingRates.some((r) => r.freeCancellation);
  const payHotel = hotel.matchingRates.some((r) => r.paymentType === "AT_HOTEL");
  const payWeb = hotel.matchingRates.some((r) => r.paymentType === "AT_WEB");

  return (
    <div className="flight-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="flight-modal hotel-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
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

        {selectedRate ? (
          <HotelBookingSummary
            hotel={hotel}
            rate={selectedRate}
            nights={nights}
            meta={meta}
            onBack={() => setSelectedRate(null)}
            onEnterGuestData={() => onEnterGuestData(selectedRate)}
          />
        ) : (
          <>
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
                    {hotel.details.ranking ? ` · ترتيب ${String(hotel.details.ranking)}` : ""}
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

            <nav className="hotel-detail-tabs" aria-label="أقسام الفندق">
              {(
                [
                  ["rooms", "الغرف"],
                  ["map", "الموقع"],
                  ["reviews", "التقييمات"],
                  ["facilities", "المرافق"],
                  ["policies", "سياسات مكان الإقامة"],
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

            {tab === "rooms" ? (
              <section className="flight-modal-section hotel-detail-rooms-section">
                <HotelRoomAccordion
                  hotel={hotel}
                  nights={nights}
                  onBookRate={(rate) => setSelectedRate(rate)}
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
                {rating > 0 ? (
                  <div className="hotel-review-score">
                    <strong>{rating.toFixed(1)}</strong>
                    <div>
                      <span>تقييم Hotelbeds</span>
                      {hotel.details.ranking != null ? (
                        <small>الترتيب {String(hotel.details.ranking)} / 100</small>
                      ) : null}
                      {hotel.details.reviewCount ? (
                        <small>
                          {Number(hotel.details.reviewCount).toLocaleString("ar")} مؤشر تقييم
                        </small>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="hint">
                    لا يوفّر Hotelbeds Sandbox تقييمات نزلاء مفصّلة لهذا العقار بعد.
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
