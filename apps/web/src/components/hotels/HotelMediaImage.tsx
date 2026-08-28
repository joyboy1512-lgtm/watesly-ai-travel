"use client";

import { useState } from "react";

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  /** Prefer smaller CDN variant for cards when source is Hotelbeds bigger/xl */
  preferMedium?: boolean;
  /** When true, reserve no min-height until image loads successfully */
  compactEmpty?: boolean;
  width?: number;
  height?: number;
};

function softenHotelbedsUrl(url: string, preferMedium?: boolean): string {
  if (!preferMedium) return url;
  return url
    .replace(/\/giata\/(xl|bigger|original)\//, "/giata/medium/")
    .replace(/\/giata\/small\//, "/giata/medium/");
}

/** Professional CSS fallback — no external asset dependency. */
export function HotelImageFallback({
  className,
  label = "فندق",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div className={`hotel-img-fallback ${className || ""}`.trim()} role="img" aria-label={label}>
      <svg viewBox="0 0 64 64" width="40" height="40" aria-hidden>
        <path
          fill="currentColor"
          d="M8 52V24l24-14 24 14v28H40V36H24v16H8zm8-4h4V32h16v16h4V26.4L32 16.8 16 26.4V48z"
        />
      </svg>
      <span>{label}</span>
    </div>
  );
}

/**
 * Safe hotel image: skeleton while loading, fallback on error/missing,
 * lazy by default. A single failed image never breaks the page.
 */
export function HotelMediaImage({
  src,
  alt,
  className,
  preferMedium,
  compactEmpty,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = src?.trim() ? softenHotelbedsUrl(src.trim(), preferMedium) : "";

  if (!url || failed) {
    if (compactEmpty && !url) {
      return null;
    }
    return <HotelImageFallback className={className} label={alt || "فندق"} />;
  }

  return (
    <span className={`hotel-media-wrap ${className || ""}`.trim()}>
      {!loaded ? <span className="hotel-media-skeleton" aria-hidden /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`hotel-media-img${loaded ? " is-loaded" : ""}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(false);
        }}
      />
    </span>
  );
}
