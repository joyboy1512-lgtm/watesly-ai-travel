"use client";

import { useEffect, useState } from "react";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

function formatFetchedTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatRemaining(ms: number, locale: "ar" | "en") {
  if (ms <= 0) return locale === "en" ? "Expired" : "انتهى";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

type Props = {
  liveMode?: boolean;
  sandbox?: boolean;
  sourceLabel?: string;
  fetchedAt?: string;
  expiresAt?: string;
  compact?: boolean;
};

export function HotelLiveBadge({
  liveMode,
  sandbox,
  sourceLabel,
  fetchedAt,
  expiresAt,
  compact,
}: Props) {
  const { locale } = useShopCopy();
  const [now, setNow] = useState(() => Date.now());
  const labelLooksSandbox =
    Boolean(sourceLabel) &&
    (/sandbox|تجريب/i.test(String(sourceLabel)) || /test/i.test(String(sourceLabel)));
  const isSandbox = sandbox ?? labelLooksSandbox ?? !liveMode;

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const remaining = Number.isFinite(expMs) ? expMs - now : null;
  const expired = remaining != null && remaining <= 0;
  const fetchedLabel = fetchedAt ? formatFetchedTime(fetchedAt) : null;

  if (isSandbox) {
    return (
      <div className={`hotel-live-badge is-sandbox${compact ? " is-compact" : ""}`}>
        <strong>
          {locale === "en"
            ? "Sample result from Hotelbeds Sandbox"
            : "نتيجة تجريبية من Hotelbeds Sandbox"}
        </strong>
        {fetchedLabel ? (
          <span>{locale === "en" ? "Fetched" : "جُلب"} {fetchedLabel}</span>
        ) : null}
        {remaining != null ? (
          <em suppressHydrationWarning>
            {expired
              ? locale === "en"
                ? "Fare expired — search again"
                : "انتهت صلاحية السعر — أعد البحث"
              : `${locale === "en" ? "Remaining" : "يتبقى"} ${formatRemaining(
                  remaining,
                  locale,
                )}`}
          </em>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`hotel-live-badge${expired ? " is-expired" : ""}${compact ? " is-compact" : ""}`}
    >
      <strong>{locale === "en" ? "Live offer" : "عرض حي"}</strong>
      {sourceLabel ? <span>{sourceLabel}</span> : null}
      {fetchedLabel ? (
        <span>{locale === "en" ? "Fetched" : "جُلب"} {fetchedLabel}</span>
      ) : null}
      {remaining != null ? (
        <em suppressHydrationWarning>
          {expired
            ? locale === "en"
              ? "Fare expired — search again"
              : "انتهت صلاحية السعر — أعد البحث"
            : `${locale === "en" ? "Remaining" : "يتبقى"} ${formatRemaining(
                remaining,
                locale,
              )}`}
        </em>
      ) : null}
    </div>
  );
}
