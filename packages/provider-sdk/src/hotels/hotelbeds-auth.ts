import { createHash } from "node:crypto";

export type HotelbedsCredentials = {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
};

export function resolveHotelbedsCredentials(
  creds?: Partial<HotelbedsCredentials>,
): HotelbedsCredentials {
  const apiKey =
    creds?.apiKey?.trim() || process.env.HOTELBEDS_API_KEY?.trim() || "";
  const apiSecret =
    creds?.apiSecret?.trim() ||
    process.env.HOTELBEDS_API_SECRET?.trim() ||
    process.env.HOTELBEDS_SECRET?.trim() ||
    "";
  const baseUrl = (
    creds?.baseUrl?.trim() ||
    process.env.HOTELBEDS_BASE_URL?.trim() ||
    "https://api.test.hotelbeds.com"
  ).replace(/\/$/, "");
  return { apiKey, apiSecret, baseUrl };
}

export function resolveHotelbedsActivityCredentials(
  creds?: Partial<HotelbedsCredentials>,
): HotelbedsCredentials {
  const apiKey =
    creds?.apiKey?.trim() ||
    process.env.HOTELBEDS_ACTIVITY_API_KEY?.trim() ||
    "";
  const apiSecret =
    creds?.apiSecret?.trim() ||
    process.env.HOTELBEDS_ACTIVITY_API_SECRET?.trim() ||
    "";
  const baseUrl = (
    creds?.baseUrl?.trim() ||
    process.env.HOTELBEDS_ACTIVITY_BASE_URL?.trim() ||
    "https://api.test.hotelbeds.com"
  ).replace(/\/$/, "");
  return { apiKey, apiSecret, baseUrl };
}

export function resolveHotelbedsTransferCredentials(
  creds?: Partial<HotelbedsCredentials>,
): HotelbedsCredentials {
  const apiKey =
    creds?.apiKey?.trim() ||
    process.env.HOTELBEDS_TRANSFER_API_KEY?.trim() ||
    "";
  const apiSecret =
    creds?.apiSecret?.trim() ||
    process.env.HOTELBEDS_TRANSFER_API_SECRET?.trim() ||
    "";
  const baseUrl = (
    creds?.baseUrl?.trim() ||
    process.env.HOTELBEDS_TRANSFER_BASE_URL?.trim() ||
    "https://api.test.hotelbeds.com"
  ).replace(/\/$/, "");
  return { apiKey, apiSecret, baseUrl };
}

export function hotelbedsSignature(apiKey: string, apiSecret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  return createHash("sha256")
    .update(`${apiKey}${apiSecret}${timestamp}`)
    .digest("hex");
}

export function hotelbedsHeaders(creds: HotelbedsCredentials): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Encoding": "gzip",
    "Content-Type": "application/json",
    "Api-key": creds.apiKey,
    "X-Signature": hotelbedsSignature(creds.apiKey, creds.apiSecret),
  };
}
