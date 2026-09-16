"use client";

import { useEffect, useState } from "react";
import { HERO_TICKER_AIRLINES } from "@/lib/hero-airline-ticker";
import { airlineLogo } from "@/lib/flight-search";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export function ShopAirlineLogoTicker() {
  const { locale } = useShopI18n();
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [pinned, setPinned] = useState(true);
  const loop = [...HERO_TICKER_AIRLINES, ...HERO_TICKER_AIRLINES];
  const label = locale === "en" ? "Airline partners" : "شركات الطيران";

  useEffect(() => {
    const hero = document.querySelector(".wg-travela-hero");
    if (!hero) return;
    const io = new IntersectionObserver(
      ([entry]) => setPinned(Boolean(entry?.isIntersecting)),
      { threshold: 0.2 },
    );
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`wg-airline-ticker${pinned ? " is-pinned" : ""}`}
      aria-label={label}
      role="region"
      hidden={!pinned}
    >
      <div className="wg-airline-ticker-track">
        {loop.map((airline, index) => {
          const src = airlineLogo(airline.code, 128);
          const name = locale === "en" ? airline.en : airline.ar;
          const key = `${airline.code}-${index}`;
          if (!src || hidden[airline.code]) return null;
          return (
            <span className="wg-airline-ticker-item" key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={name}
                width={128}
                height={64}
                loading={index < HERO_TICKER_AIRLINES.length ? "eager" : "lazy"}
                onError={() =>
                  setHidden((prev) => (prev[airline.code] ? prev : { ...prev, [airline.code]: true }))
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
