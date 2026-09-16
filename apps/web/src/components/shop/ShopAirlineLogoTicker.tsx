"use client";

import { useEffect, useState } from "react";
import { HERO_TICKER_AIRLINES, heroTickerLogoSrc } from "@/lib/hero-airline-ticker";
import { airlineLogo } from "@/lib/flight-search";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

function TickerLogo({
  code,
  name,
}: {
  code: string;
  name: string;
}) {
  const [step, setStep] = useState<"lockup" | "logo" | "raster">("lockup");
  const [hidden, setHidden] = useState(false);
  const src =
    step === "lockup"
      ? heroTickerLogoSrc(code, "lockup")
      : step === "logo"
        ? heroTickerLogoSrc(code, "logo")
        : airlineLogo(code, 256);

  if (hidden || !src) return null;

  return (
    <span className="wg-airline-ticker-item">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={220}
        height={80}
        decoding="async"
        onError={() => {
          if (step === "lockup") setStep("logo");
          else if (step === "logo") setStep("raster");
          else setHidden(true);
        }}
      />
    </span>
  );
}

export function ShopAirlineLogoTicker() {
  const { locale } = useShopI18n();
  const [pinned, setPinned] = useState(true);
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

  const group = (copy: number) =>
    HERO_TICKER_AIRLINES.map((airline) => {
      const name = locale === "en" ? airline.en : airline.ar;
      return <TickerLogo key={`${airline.code}-${copy}`} code={airline.code} name={name} />;
    });

  return (
    <div
      className={`wg-airline-ticker${pinned ? " is-pinned" : ""}`}
      aria-label={label}
      role="region"
      hidden={!pinned}
    >
      <div className="wg-airline-ticker-track">
        <div className="wg-airline-ticker-group">{group(0)}</div>
        <div className="wg-airline-ticker-group" aria-hidden="true">
          {group(1)}
        </div>
      </div>
    </div>
  );
}
