"use client";

import { useMemo, useState } from "react";
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
 * Responsive hotel gallery. Renders nothing when there are no images —
 * does not reserve empty white space.
 */
export function HotelGallery({ images, hotelName, heroUrl }: Props) {
  const urls = useMemo(() => normalizeList(images, heroUrl), [images, heroUrl]);
  const [active, setActive] = useState(0);

  if (!urls.length) return null;

  const main = urls[Math.min(active, urls.length - 1)]!;

  return (
    <section className="hotel-gallery" aria-label={`صور ${hotelName}`}>
      <div className="hotel-gallery-main">
        <HotelMediaImage src={main} alt={`${hotelName} — صورة ${active + 1}`} />
      </div>
      {urls.length > 1 ? (
        <ul className="hotel-gallery-thumbs">
          {urls.slice(0, 12).map((url, idx) => (
            <li key={url}>
              <button
                type="button"
                className={idx === active ? "on" : undefined}
                aria-label={`عرض الصورة ${idx + 1}`}
                aria-current={idx === active ? "true" : undefined}
                onClick={() => setActive(idx)}
              >
                <HotelMediaImage src={url} alt="" preferMedium />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
