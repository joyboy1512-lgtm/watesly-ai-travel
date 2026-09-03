"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAlert } from "@/lib/platform-api";
import { getShopSession } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

type Props = {
  origin: string;
  destination: string;
  departDate?: string;
  returnDate?: string;
  currentPriceMinor: number;
  currency: string;
};

export function ShopWatchPrice(props: Props) {
  const { t } = useShopI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (!props.origin || !props.destination || props.currentPriceMinor <= 0) return null;

  async function watch() {
    setError("");
    if (!getShopSession()) {
      const next = encodeURIComponent(
        typeof window !== "undefined" ? window.location.pathname + window.location.search : "/",
      );
      router.push(`/account/login?next=${next}`);
      return;
    }
    setBusy(true);
    try {
      const target = Math.max(1, Math.round(props.currentPriceMinor * 0.95));
      await createAlert({
        origin: props.origin,
        destination: props.destination,
        currentPriceMinor: props.currentPriceMinor,
        targetPriceMinor: target,
        currency: props.currency,
        departDate: props.departDate,
        returnDate: props.returnDate,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("watchPriceNeedLogin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shop-watch-price">
      <button
        type="button"
        className={`shop-btn-ghost shop-watch-price-btn${done ? " on" : ""}`}
        disabled={busy || done}
        onClick={() => void watch()}
      >
        {done ? t("watchPriceDone") : t("watchPrice")}
      </button>
      <span className="shop-hint">{t("watchPriceHint")}</span>
      {error ? <p className="shop-error">{error}</p> : null}
    </div>
  );
}
