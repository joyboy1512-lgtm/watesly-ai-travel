"use client";

import { useEffect, useMemo, useState } from "react";
import { HotelMediaImage } from "./HotelMediaImage";

export type HotelGalleryImage = {
  url: string;
  roomCode?: string;
  type?: string;
};

type Props = {
  images: HotelGalleryImage[];
  hotelName: string;
  /** Primary hero URL (may duplicate first gallery item) */
  heroUrl?: string;
};

function normalizeList(images: HotelGalleryImage[], heroUrl?: string): string[] {
  const urls: string[] = [];
  const push = (u?: string) => {
    const v = String(u || "").trim();
    if (!v || urls.includes(v)) return;
    urls.push(v);
  };
  push(heroUrl);
  for (const img of images) push(img.url);
  return urls;
}

/**
 * Hotel gallery: desktop main + side grid, mobile swipe, counter,
 * fullscreen + keyboard. Renders nothing when empty (no reserved whitespace).
 */
export function HotelGallery({ images, hotelName, heroUrl }: Props) {
  const urls = useMemo(() => normalizeList(images, heroUrl), [images, heroUrl]);
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % urls.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + urls.length) % urls.length);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen, urls.length]);

  if (!urls.length) return null;

  const index = Math.min(active, urls.length - 1);
  const main = urls[index]!;
  const side = urls.slice(1, 5);

  function go(delta: number) {
    setActive((i) => (i + delta + urls.length) % urls.length);
  }

  return (
    <section className="hotel-gallery hotel-gallery-p3" aria-label={`صور ${hotelName}`}>
      <div className="hotel-gallery-grid">
        <button
          type="button"
          className="hotel-gallery-main"
          onClick={() => setFullscreen(true)}
          aria-label="عرض الصورة بحجم كامل"
        >
          <HotelMediaImage src={main} alt={`${hotelName} — صورة ${index + 1}`} />
          <span className="hotel-gallery-counter">
            {index + 1} / {urls.length}
          </span>
        </button>
        {side.length ? (
          <div className="hotel-gallery-side">
            {side.map((url, idx) => (
              <button
                key={url}
                type="button"
                className={idx + 1 === index ? "on" : undefined}
                aria-label={`عرض الصورة ${idx + 2}`}
                onClick={() => {
                  setActive(idx + 1);
                  setFullscreen(true);
                }}
              >
                <HotelMediaImage src={url} alt="" preferMedium />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {urls.length > 1 ? (
        <div className="hotel-gallery-mobile-strip" dir="ltr">
          <button type="button" className="hotel-gallery-nav" onClick={() => go(-1)} aria-label="السابق">
            ‹
          </button>
          <ul className="hotel-gallery-thumbs">
            {urls.slice(0, 12).map((url, idx) => (
              <li key={url}>
                <button
                  type="button"
                  className={idx === index ? "on" : undefined}
                  aria-label={`عرض الصورة ${idx + 1}`}
                  aria-current={idx === index ? "true" : undefined}
                  onClick={() => setActive(idx)}
                >
                  <HotelMediaImage src={url} alt="" preferMedium />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="hotel-gallery-nav" onClick={() => go(1)} aria-label="التالي">
            ›
          </button>
        </div>
      ) : null}

      {fullscreen ? (
        <div
          className="hotel-gallery-fullscreen"
          role="dialog"
          aria-modal="true"
          aria-label="معرض الصور"
          onClick={() => setFullscreen(false)}
        >
          <div className="hotel-gallery-fullscreen-inner" onClick={(e) => e.stopPropagation()}>
            <header>
              <span>
                {index + 1} / {urls.length}
              </span>
              <button type="button" aria-label="إغلاق" onClick={() => setFullscreen(false)}>
                ×
              </button>
            </header>
            <div className="hotel-gallery-fullscreen-stage">
              <button type="button" onClick={() => go(-1)} aria-label="السابق">
                ‹
              </button>
              <HotelMediaImage src={main} alt={`${hotelName} — صورة ${index + 1}`} />
              <button type="button" onClick={() => go(1)} aria-label="التالي">
                ›
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
