#!/usr/bin/env node
/**
 * Step-1 Hotelbeds suite probe (hotel / transfer / activity).
 * Reads env only — never prints secrets.
 *
 * Usage (on the droplet / local with keys):
 *   node --import tsx scripts/check-hotelbeds-status.mjs
 */
import { createHash } from "node:crypto";

function sig(apiKey, apiSecret) {
  const ts = Math.floor(Date.now() / 1000);
  return createHash("sha256").update(`${apiKey}${apiSecret}${ts}`).digest("hex");
}

async function probe(label, baseUrl, apiKey, apiSecret, paths) {
  if (!apiKey || !apiSecret) {
    console.log(`[${label}] SKIP — credentials not set`);
    return;
  }
  const headers = {
    Accept: "application/json",
    "Api-key": apiKey,
    "X-Signature": sig(apiKey, apiSecret),
  };
  for (const path of paths) {
    const url = `${baseUrl.replace(/\/$/, "")}${path}`;
    try {
      const res = await fetch(url, { method: "GET", headers });
      const body = await res.text();
      const snippet = body.replace(/\s+/g, " ").slice(0, 160);
      console.log(
        `[${label}] ${path} → HTTP ${res.status} ${snippet || "(empty)"}`,
      );
      if (res.ok || res.status === 401 || res.status === 403) return;
    } catch (err) {
      console.log(`[${label}] ${path} → ERROR ${err instanceof Error ? err.message : err}`);
    }
  }
}

const hotelBase = process.env.HOTELBEDS_BASE_URL || "https://api.test.hotelbeds.com";
const transferBase =
  process.env.HOTELBEDS_TRANSFER_BASE_URL || hotelBase;
const activityBase =
  process.env.HOTELBEDS_ACTIVITY_BASE_URL || hotelBase;

await probe(
  "hotel",
  hotelBase,
  process.env.HOTELBEDS_API_KEY,
  process.env.HOTELBEDS_API_SECRET || process.env.HOTELBEDS_SECRET,
  ["/hotel-api/1.0/status"],
);

await probe(
  "transfer",
  transferBase,
  process.env.HOTELBEDS_TRANSFER_API_KEY,
  process.env.HOTELBEDS_TRANSFER_API_SECRET,
  ["/transfer-api/1.0/status", "/hotel-api/1.0/status"],
);

await probe(
  "activity",
  activityBase,
  process.env.HOTELBEDS_ACTIVITY_API_KEY,
  process.env.HOTELBEDS_ACTIVITY_API_SECRET,
  [
    "/activity-api/3.0/status",
    "/activity-booking-api/1.0/status",
    "/hotel-api/1.0/status",
  ],
);

console.log("Done. Keys are never printed.");
