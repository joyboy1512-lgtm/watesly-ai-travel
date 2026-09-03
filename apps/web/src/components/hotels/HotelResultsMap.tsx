"use client";

import { useMemo } from "react";
import { formatMoneyMinor } from "@/lib/format";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

export type HotelMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priceMinor: number;
  currency: string;
  rating?: number;
};

type Props = {
  pins: HotelMapPin[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

const TILE = 256;
const ZOOM = 13;
const VIEW_W = 640;
const VIEW_H = 360;

function project(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

function tileUrl(x: number, y: number, z: number) {
  const n = 2 ** z;
  const tx = ((x % n) + n) % n;
  return `https://tile.openstreetmap.org/${z}/${tx}/${y}.png`;
}

/**
 * Interactive OSM tile map with price markers — no extra map SDK.
 * Identity stays the existing shop navy/card chrome.
 */
export function HotelResultsMap({ pins, selectedId, onSelect }: Props) {
  const { t } = useShopCopy();
  const active = pins.find((p) => p.id === selectedId) || pins[0];
  const layout = useMemo(() => {
    if (!active) return null;
    const center = project(active.lat, active.lng, ZOOM);
    const originX = center.x * TILE - VIEW_W / 2;
    const originY = center.y * TILE - VIEW_H / 2;
    const minTx = Math.floor(originX / TILE);
    const minTy = Math.floor(originY / TILE);
    const maxTx = Math.floor((originX + VIEW_W) / TILE);
    const maxTy = Math.floor((originY + VIEW_H) / TILE);
    const tiles: Array<{ key: string; left: number; top: number; src: string }> = [];
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        tiles.push({
          key: `${tx}-${ty}`,
          left: tx * TILE - originX,
          top: ty * TILE - originY,
          src: tileUrl(tx, ty, ZOOM),
        });
      }
    }
    const markers = pins.map((pin) => {
      const p = project(pin.lat, pin.lng, ZOOM);
      return {
        ...pin,
        left: p.x * TILE - originX,
        top: p.y * TILE - originY,
      };
    });
    return { tiles, markers };
  }, [active, pins]);

  if (!active || !layout) {
    return <p className="shop-hotel-map-empty">{t("map")}</p>;
  }

  return (
    <div className="shop-hotel-map">
      <div
        className="shop-hotel-map-canvas"
        role="img"
        aria-label={t("mapHotelsNearby")}
      >
        {layout.tiles.map((tile) => (
          // OSM raster tiles; attribution below. eslint-disable-next-line
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            className="shop-hotel-map-tile"
            style={{ left: tile.left, top: tile.top }}
            draggable={false}
          />
        ))}
        {layout.markers.map((pin) => (
          <button
            key={pin.id}
            type="button"
            className={`shop-hotel-map-marker${pin.id === active.id ? " on" : ""}`}
            style={{ left: pin.left, top: pin.top }}
            onClick={() => onSelect?.(pin.id)}
            title={pin.name}
          >
            {formatMoneyMinor(pin.priceMinor, pin.currency)}
          </button>
        ))}
        <span className="shop-hotel-map-copy">{t("osmAttribution")}</span>
      </div>
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
              <span>
                {pin.name}
                {pin.rating ? ` · ${pin.rating.toFixed(1)}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
