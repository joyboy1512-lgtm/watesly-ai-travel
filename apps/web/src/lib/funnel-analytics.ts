/** Client analytics funnel — never send PII (passport, full email, phone, card). */

export type FunnelEventName =
  | "search_started"
  | "search_submit"
  | "results_loaded"
  | "search_failed"
  | "filter_applied"
  | "sort_changed"
  | "offer_opened"
  | "flight_selected"
  | "fare_selected"
  | "hotel_selected"
  | "room_selected"
  | "reprice_started"
  | "reprice_success"
  | "reprice_changed"
  | "reprice_failed"
  | "checkout_started"
  | "validation_failed"
  | "payment_started"
  | "payment_success"
  | "payment_failed"
  | "booking_started"
  | "booking_confirmed"
  | "booking_failed"
  | "support_requested";

export type FunnelPayload = {
  event: FunnelEventName;
  service?: "flight" | "hotel" | "transfer" | "activity" | "package";
  provider?: string;
  durationMs?: number;
  status?: string;
  errorCode?: string;
  meta?: Record<string, string | number | boolean | null>;
};

const QUEUE_KEY = "wg_funnel_queue";

function scrub(payload: FunnelPayload): FunnelPayload {
  const meta = { ...(payload.meta || {}) };
  for (const key of Object.keys(meta)) {
    if (/email|phone|passport|card|cvv|name|token|secret/i.test(key)) {
      delete meta[key];
    }
  }
  return { ...payload, meta };
}

export function trackFunnel(payload: FunnelPayload): void {
  if (typeof window === "undefined") return;
  const safe = scrub(payload);
  const row = { ...safe, at: new Date().toISOString(), path: window.location.pathname };
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.push(row);
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-200)));
  } catch {
    /* ignore */
  }
  if (process.env.NODE_ENV !== "production") {
    console.info("[funnel]", row.event, row.service || "", row.status || "");
  }
  // Optional beacon endpoint when configured
  const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_URL?.trim();
  if (endpoint) {
    try {
      navigator.sendBeacon?.(endpoint, JSON.stringify(row));
    } catch {
      /* ignore */
    }
  }
}

export function readFunnelQueue(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(QUEUE_KEY) || "[]") as unknown[];
  } catch {
    return [];
  }
}
