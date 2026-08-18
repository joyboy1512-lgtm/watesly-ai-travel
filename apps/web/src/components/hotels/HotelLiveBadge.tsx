"use client";

import { useEffect, useState } from "react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "انتهى";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

type Props = {
  liveMode?: boolean;
  sourceLabel?: string;
  fetchedAt?: string;
  expiresAt?: string;
  compact?: boolean;
};

export function HotelLiveBadge({
  liveMode,
  sourceLabel,
  fetchedAt,
  expiresAt,
  compact,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const remaining = Number.isFinite(expMs) ? expMs - now : null;
  const expired = remaining != null && remaining <= 0;
  const fetchedLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className={`hotel-live-badge${expired ? " is-expired" : ""}${compact ? " is-compact" : ""}`}>
      <strong>{liveMode ? "عرض حي" : "عرض تجريبي"}</strong>
      {sourceLabel ? <span>{sourceLabel}</span> : null}
      {fetchedLabel ? <span>جُلب {fetchedLabel}</span> : null}
      {remaining != null ? (
        <em>{expired ? "انتهت صلاحية السعر — أعد البحث" : `يتبقى ${formatRemaining(remaining)}`}</em>
      ) : null}
    </div>
  );
}
