"use client";

import { formatMoneyMinor } from "@/lib/format";

export type HotelMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priceMinor: number;
  currency: string;
};

type Props = {
  pins: HotelMapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

/**
 * Lightweight results map without extra deps: OSM embed centered on
 * selected/first pin + clickable price markers list synced with cards.
 * Loaded only when the parent opens the map panel (mobile-safe).
 */
export function HotelResultsMap({ pins, selectedId, onSelect }: Props) {
  const active = pins.find((p) => p.id === selectedId) || pins[0];
  if (!active) {
    return <p className="shop-hotel-map-empty">لا توجد إحداثيات للعرض على الخريطة.</p>;
  }

  const delta = 0.08;
  const bbox = [
    active.lng - delta,
    active.lat - delta,
    active.lng + delta,
    active.lat + delta,
  ].join("%2C");
  const marker = `${active.lat}%2C${active.lng}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

  return (
    <div className="shop-hotel-map">
      <iframe title="خريطة الفنادق" src={src} loading="lazy" className="shop-hotel-map-frame" />
      <ul className="shop-hotel-map-pins">
        {pins.slice(0, 24).map((pin) => (
          <li key={pin.id}>
            <button
              type="button"
              className={pin.id === active.id ? "on" : undefined}
              onClick={() => onSelect?.(pin.id)}
              onMouseEnter={() => onSelect?.(pin.id)}
            >
              <strong>{formatMoneyMinor(pin.priceMinor, pin.currency)}</strong>
              <span>{pin.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
