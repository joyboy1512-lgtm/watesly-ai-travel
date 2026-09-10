import { randomBytes, randomUUID } from "crypto";
import { sharedDelete, sharedGet, sharedSet } from "./shared-kv";

const SESSION_EPOCH_PREFIX = "shop:sess:epoch:";
const SESSION_JTI_PREFIX = "shop:sess:jti:";
const CSRF_PREFIX = "shop:csrf:";

export async function getSessionEpoch(customerId: string): Promise<number> {
  const raw = await sharedGet(`${SESSION_EPOCH_PREFIX}${customerId}`);
  const n = Number(raw || "0");
  return Number.isFinite(n) ? n : 0;
}

export async function bumpSessionEpoch(customerId: string): Promise<number> {
  const next = (await getSessionEpoch(customerId)) + 1;
  await sharedSet(
    `${SESSION_EPOCH_PREFIX}${customerId}`,
    String(next),
    40 * 24 * 3600_000,
  );
  return next;
}

export async function revokeSessionJti(jti: string, ttlMs: number): Promise<void> {
  if (!jti) return;
  await sharedSet(`${SESSION_JTI_PREFIX}${jti}`, "1", Math.max(ttlMs, 60_000));
}

export async function isSessionJtiRevoked(jti: string | undefined): Promise<boolean> {
  if (!jti) return false;
  return (await sharedGet(`${SESSION_JTI_PREFIX}${jti}`)) != null;
}

export function newSessionJti(): string {
  return randomUUID();
}

export function newCsrfToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function storeCsrfToken(token: string, ttlMs: number): Promise<void> {
  await sharedSet(`${CSRF_PREFIX}${token}`, "1", ttlMs);
}

export const CUSTOMER_COOKIE = "wg_customer_token";
export const CSRF_COOKIE = "wg_csrf";

export function cookieSecureFlag(): boolean {
  return (
    process.env.COOKIE_SECURE === "1" ||
    process.env.NODE_ENV === "production" ||
    process.env.PAYMENT_ENV === "production"
  );
}

export function buildSetCookie(
  name: string,
  value: string,
  opts: {
    maxAgeSec: number;
    httpOnly: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    path?: string;
    secure?: boolean;
  },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path || "/"}`,
    `Max-Age=${Math.max(0, Math.floor(opts.maxAgeSec))}`,
    `SameSite=${opts.sameSite || "Lax"}`,
  ];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure ?? cookieSecureFlag()) parts.push("Secure");
  return parts.join("; ");
}

export function buildClearCookie(name: string, httpOnly: boolean): string {
  return buildSetCookie(name, "", {
    maxAgeSec: 0,
    httpOnly,
    sameSite: "Lax",
  });
}

export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
