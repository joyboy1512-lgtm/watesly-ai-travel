"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatMoneyMinor } from "@/lib/format";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import {
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_TILE,
  centroidLatLng,
  clampMapZoom,
  mapPointerWasClick,
  markerInView,
  panCenter,
  worldPixels,
  zoomAroundPoint,
  zoomToFitPins,
  type MapLatLng,
} from "@/lib/hotel-map-view";

export type HotelMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  priceMinor: number;
  currency: string;
  rating?: number;
  stars?: number;
  imageUrl?: string;
};

type Props = {
  pins: HotelMapPin[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Open the hotel detail page for this pin. */
  onOpen?: (id: string) => void;
  variant?: "default" | "sidebar";
};

const VIEW_W = 640;
const VIEW_H = 360;
const SIDEBAR_VIEW_W = 450;
const SIDEBAR_VIEW_H = 520;

function tileUrl(x: number, y: number, z: number) {
  const n = 2 ** z;
  const tx = ((x % n) + n) % n;
  return `https://tile.openstreetmap.org/${z}/${tx}/${y}.png`;
}

function pinSignature(pins: HotelMapPin[]): string {
  return pins
    .map((p) => p.id)
    .sort()
    .join("|");
}

/**
 * Interactive OSM tile map: pan, zoom, pick a hotel, open its page.
 */
export function HotelResultsMap({
  pins,
  selectedId,
  onSelect,
  onOpen,
  variant = "default",
}: Props) {
  const { t } = useShopCopy();
  const canvasRef = useRef<HTMLDivElement>(null);
  const skipPanRef = useRef(false);
  const dragRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number } | null>(
    null,
  );
  const centerRef = useRef<MapLatLng | null>(null);
  const zoomRef = useRef(13);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState<MapLatLng | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selected = pins.find((p) => p.id === selectedId) || null;
  const viewW = box.w || (variant === "sidebar" ? SIDEBAR_VIEW_W : VIEW_W);
  const viewH = box.h || (variant === "sidebar" ? SIDEBAR_VIEW_H : VIEW_H);
  const sig = pinSignature(pins);

  const fitView = (list: HotelMapPin[], width: number, height: number) => {
    const mid = centroidLatLng(list);
    if (!mid) return;
    setCenter(mid);
    setZoom(zoomToFitPins(list, width, height));
  };

  const dismissPopup = () => {
    setPickedId(null);
    onSelect?.(null);
  };

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const apply = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 8 && r.height > 8) {
        setBox({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [variant, pins.length, expanded]);

  useEffect(() => {
    if (!pins.length) return;
    setPickedId(null);
    fitView(pins, viewW, viewH);
    // Refit when the visible hotel set changes (search / filters).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  useEffect(() => {
    if (!selected || !center || skipPanRef.current) {
      skipPanRef.current = false;
      return;
    }
    if (!markerInView(selected, center, zoom, viewW, viewH, 40)) {
      setCenter({ lat: selected.lat, lng: selected.lng });
    }
  }, [selectedId, selected, center, zoom, viewW, viewH]);

  useEffect(() => {
    centerRef.current = center;
  }, [center]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const current = centerRef.current;
      const z = zoomRef.current;
      if (!current) return;
      const next = clampMapZoom(z + (e.deltaY > 0 ? -1 : 1));
      if (next === z) return;
      const rect = el.getBoundingClientRect();
      const moved = zoomAroundPoint(
        current,
        z,
        next,
        viewW,
        viewH,
        e.clientX - rect.left,
        e.clientY - rect.top,
      );
      centerRef.current = moved;
      zoomRef.current = next;
      setCenter(moved);
      setZoom(next);
    };
    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => el.removeEventListener("wheel", onWheelNative);
  }, [viewW, viewH]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => {
      const el = canvasRef.current;
      if (!el || !pins.length) return;
      const r = el.getBoundingClientRect();
      if (r.width > 8 && r.height > 8) {
        setBox({ w: Math.round(r.width), h: Math.round(r.height) });
        fitView(pins, r.width, r.height);
      }
    });
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const layout = useMemo(() => {
    if (!center) return null;
    const origin = worldPixels(center.lat, center.lng, zoom);
    const originX = origin.x - viewW / 2;
    const originY = origin.y - viewH / 2;
    const minTx = Math.floor(originX / MAP_TILE);
    const minTy = Math.floor(originY / MAP_TILE);
    const maxTx = Math.floor((originX + viewW) / MAP_TILE);
    const maxTy = Math.floor((originY + viewH) / MAP_TILE);
    const tiles: Array<{ key: string; left: number; top: number; src: string }> = [];
    for (let ty = minTy; ty <= maxTy; ty += 1) {
      for (let tx = minTx; tx <= maxTx; tx += 1) {
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          left: tx * MAP_TILE - originX,
          top: ty * MAP_TILE - originY,
          src: tileUrl(tx, ty, zoom),
        });
      }
    }
    const markers = pins.map((pin) => {
      const p = worldPixels(pin.lat, pin.lng, zoom);
      return {
        ...pin,
        left: p.x - originX,
        top: p.y - originY,
      };
    });
    return { tiles, markers };
  }, [center, pins, zoom, viewW, viewH]);

  const pickHotel = (id: string) => {
    skipPanRef.current = true;
    if (pickedId === id && onOpen) {
      onOpen(id);
      return;
    }
    setPickedId(id);
    onSelect?.(id);
  };

  const onCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        ".shop-hotel-map-marker, .shop-hotel-map-popup, .shop-hotel-map-tools, .shop-hotel-map-expand, .shop-hotel-map-fullhead",
      )
    ) {
      return;
    }
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || !center) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setCenter(panCenter(center, zoom, dx, dy));
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      if (mapPointerWasClick(e.clientX - drag.startX, e.clientY - drag.startY)) {
        dismissPopup();
      }
    }
    dragRef.current = null;
    setDragging(false);
  };

  const bumpZoom = (delta: number) => {
    if (!center) return;
    const next = clampMapZoom(zoom + delta);
    if (next === zoom) return;
    setCenter(zoomAroundPoint(center, zoom, next, viewW, viewH, viewW / 2, viewH / 2));
    setZoom(next);
  };

  if (!pins.length || !center || !layout) {
    return <p className="shop-hotel-map-empty">{t("map")}</p>;
  }

  const popup = layout.markers.find((pin) => pin.id === pickedId);
  const activeId = pickedId || selected?.id;

  return (
    <div
      className={`shop-hotel-map${variant === "sidebar" ? " shop-hotel-map-sidebar" : ""}${expanded ? " is-expanded" : ""}`}
    >
      {expanded ? (
        <div className="shop-hotel-map-fullhead">
          <strong>{t("mapHotelsNearby")}</strong>
          <button type="button" onClick={() => setExpanded(false)}>
            {t("closeFullMap")}
          </button>
        </div>
      ) : null}
      <div
        ref={canvasRef}
        className={`shop-hotel-map-canvas${dragging ? " is-dragging" : ""}`}
        role="application"
        aria-label={t("mapHotelsNearby")}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {layout.tiles.map((tile) => (
          // OSM raster tiles; attribution below.
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
            className={`shop-hotel-map-marker${pin.id === activeId ? " on" : ""}`}
            style={{ left: pin.left, top: pin.top }}
            onClick={() => pickHotel(pin.id)}
            onDoubleClick={() => onOpen?.(pin.id)}
            title={pin.name}
          >
            {formatMoneyMinor(pin.priceMinor, pin.currency)}
          </button>
        ))}
        {popup ? (
          <div
            className="shop-hotel-map-popup"
            style={{ left: popup.left, top: popup.top }}
          >
            {popup.imageUrl ? (
              <img src={popup.imageUrl} alt="" className="shop-hotel-map-popup-img" />
            ) : null}
            <div className="shop-hotel-map-popup-body">
              <strong>{popup.name}</strong>
              <span>
                {popup.stars ? `${"★".repeat(Math.min(5, popup.stars))} · ` : ""}
                {popup.rating ? `${popup.rating.toFixed(1)} · ` : ""}
                {formatMoneyMinor(popup.priceMinor, popup.currency)}
              </span>
              <button
                type="button"
                className="shop-hotel-map-popup-go"
                onClick={() => onOpen?.(popup.id)}
              >
                {t("openHotelPage")}
              </button>
            </div>
          </div>
        ) : null}
        {expanded ? null : (
          <button
            type="button"
            className="shop-hotel-map-expand"
            onClick={() => setExpanded(true)}
          >
            {t("expandFullMap")}
          </button>
        )}
        <div className="shop-hotel-map-tools">
          <button type="button" onClick={() => bumpZoom(1)} disabled={zoom >= MAP_MAX_ZOOM} aria-label={t("mapZoomIn")}>
            +
          </button>
          <button type="button" onClick={() => bumpZoom(-1)} disabled={zoom <= MAP_MIN_ZOOM} aria-label={t("mapZoomOut")}>
            −
          </button>
          <button type="button" onClick={() => fitView(pins, viewW, viewH)} aria-label={t("mapFitHotels")}>
            ⌂
          </button>
          {expanded ? (
            <button type="button" onClick={() => setExpanded(false)} aria-label={t("closeFullMap")}>
              ✕
            </button>
          ) : (
            <button type="button" onClick={() => setExpanded(true)} aria-label={t("expandFullMap")}>
              ⛶
            </button>
          )}
        </div>
        <span className="shop-hotel-map-copy">{t("osmAttribution")}</span>
      </div>
      {variant === "sidebar" ? null : (
        <ul className="shop-hotel-map-pins">
          {pins.slice(0, 24).map((pin) => (
            <li key={pin.id}>
              <button
                type="button"
                className={pin.id === activeId ? "on" : undefined}
                onClick={() => pickHotel(pin.id)}
                onDoubleClick={() => onOpen?.(pin.id)}
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
      )}
    </div>
  );
}
