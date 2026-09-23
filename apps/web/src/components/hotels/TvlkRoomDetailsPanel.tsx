"use client";

import { useEffect, useState } from "react";
import { translateRoomNameAr } from "@watesly-travel/shared";
import type { HotelOfferRow, HotelRoomOption } from "@/lib/hotel-search";
import {
  classifyRoomFact,
  collectRoomImages,
  guestCountForRoom,
  groupRoomDetailFacts,
  type RoomFactKind,
} from "@/lib/hotel-room-table";
import { formatMoneyMinor } from "@/lib/format";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { HotelMediaImage } from "@/components/hotels/HotelMediaImage";

type Props = {
  room: HotelRoomOption;
  hotel: HotelOfferRow;
  fromMinor: number;
  onClose: () => void;
  onSeeOptions: () => void;
};

function FactIcon({ kind }: { kind: RoomFactKind }) {
  const common = { viewBox: "0 0 16 16", width: 16, height: 16, "aria-hidden": true as const };
  if (kind === "size") {
    return (
      <svg {...common}>
        <rect x="2.2" y="2.2" width="11.6" height="11.6" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  if (kind === "bed") {
    return (
      <svg {...common}>
        <path d="M2 11.4V6.6A1.6 1.6 0 0 1 3.6 5h4.2A2.2 2.2 0 0 1 10 7.2V11" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 11.4h12M10 7.4h2.4A1.6 1.6 0 0 1 14 9v2.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  if (kind === "access") {
    return (
      <svg {...common}>
        <circle cx="8" cy="3.4" r="1.4" fill="currentColor" />
        <path d="M6.2 6.4h3.1l1.6 6.2M5.2 13.2l1.6-5.2M4.4 9.2h6.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "ac") {
    return (
      <svg {...common}>
        <rect x="2" y="4" width="12" height="7.2" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M4 12.8h8" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "wifi") {
    return (
      <svg {...common}>
        <path d="M3 7.1a7 7 0 0 1 10 0M5.1 9.2a4.2 4.2 0 0 1 5.8 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="8" cy="12" r="1.1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="8" cy="8" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function TvlkRoomDetailsPanel({ room, hotel, fromMinor, onClose, onSeeOptions }: Props) {
  const { t } = useShopCopy();
  const names = translateRoomNameAr(room.name);
  const images = collectRoomImages(room, {
    hotelHero: typeof hotel.details.imageUrl === "string" ? hotel.details.imageUrl : undefined,
    hotelImages: Array.isArray(hotel.details.images)
      ? (hotel.details.images as Array<{ url?: string; roomCode?: string; type?: string }>)
      : [],
  });
  const [active, setActive] = useState(0);
  const groups = groupRoomDetailFacts(room);
  const guests = guestCountForRoom(room);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % Math.max(1, images.length));
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % Math.max(1, images.length));
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [images.length, onClose]);

  const index = images.length ? Math.min(active, images.length - 1) : 0;

  return (
    <div className="tvlk-room-panel" role="dialog" aria-modal="true" aria-labelledby="tvlk-room-panel-title">
      <button type="button" className="tvlk-room-panel-scrim" aria-label={t("hideRoomDetails")} onClick={onClose} />
      <div className="tvlk-room-panel-card">
        <header className="tvlk-room-panel-head">
          <h3 id="tvlk-room-panel-title">{names.ar}</h3>
          <button type="button" className="tvlk-room-panel-close" onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </header>
        <div className="tvlk-room-panel-grid">
          <div className="tvlk-room-panel-media">
            <div className="tvlk-room-panel-hero">
              {images.length ? (
                <HotelMediaImage src={images[index]} alt={names.ar} className="tvlk-room-panel-photo" preferMedium />
              ) : (
                <div className="tvlk-room-panel-photo is-empty" />
              )}
              {images.length > 1 ? (
                <>
                  <button type="button" className="tvlk-room-panel-nav prev" onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}>
                    ‹
                  </button>
                  <button type="button" className="tvlk-room-panel-nav next" onClick={() => setActive((i) => (i + 1) % images.length)}>
                    ›
                  </button>
                </>
              ) : null}
            </div>
            {images.length > 1 ? (
              <div className="tvlk-room-panel-thumbs" role="list">
                {images.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={i === index ? "on" : undefined}
                    onClick={() => setActive(i)}
                  >
                    <HotelMediaImage src={url} alt="" compactEmpty />
                  </button>
                ))}
              </div>
            ) : null}
            {images.length ? (
              <p className="tvlk-room-panel-count">
                {index + 1}/{images.length}
              </p>
            ) : null}
          </div>
          <aside className="tvlk-room-panel-info">
            <section>
              <h4>{t("roomInformation")}</h4>
              <ul>
                {groups.info.map((fact) => (
                  <li key={fact}>
                    <FactIcon kind={classifyRoomFact(fact)} />
                    <span>{fact}</span>
                  </li>
                ))}
                <li>
                  <FactIcon kind="other" />
                  <span>{t("guestsInRoom", { n: guests })}</span>
                </li>
              </ul>
            </section>
            {groups.features.length ? (
              <section>
                <h4>{t("roomFeaturesLike")}</h4>
                <ul>
                  {groups.features.map((fact) => (
                    <li key={fact}>
                      <FactIcon kind={classifyRoomFact(fact)} />
                      <span>{fact}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {groups.basic.length ? (
              <section>
                <h4>{t("basicFacilities")}</h4>
                <ul className="tvlk-room-panel-cols">
                  {groups.basic.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {groups.room.length ? (
              <section>
                <h4>{t("roomFacilitiesSec")}</h4>
                <ul className="tvlk-room-panel-cols">
                  {groups.room.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              </section>
            ) : null}
            {room.description ? <p className="tvlk-room-panel-desc">{room.description}</p> : null}
            <div className="tvlk-room-panel-cta">
              <small>
                {t("startingFromPrice")}{" "}
                <strong>{formatMoneyMinor(fromMinor, hotel.currency)}</strong> / {t("nightlyPrice")}
              </small>
              <button type="button" onClick={onSeeOptions}>
                {t("seeRoomOptions")}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
