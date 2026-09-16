import { createHmac, randomInt, randomUUID, timingSafeEqual } from "crypto";
import {
  isProductionRuntime,
  otpDeliveryConfigured,
} from "../common/security-env";
import {
  sharedDelete,
  sharedGetJson,
  sharedSetJson,
  sharedSetNxJson,
} from "../common/shared-kv";

export type UnlockOtpEntry = {
  codeHash: string;
  expiresAt: number;
  attempts: number;
};

export const unlockOtpStore = new Map<string, UnlockOtpEntry>();
export const webhookReceiptStore = new Map<string, number>();

export function unlockRequiresOtp(): boolean {
  const flag = process.env.SHOP_UNLOCK_REQUIRE_OTP;
  if (flag === "0" || flag === "false") {
    return isProductionRuntime() ? otpDeliveryConfigured() : false;
  }
  if (flag === "1" || flag === "true") return true;
  if (isProductionRuntime()) return otpDeliveryConfigured();
  return false;
}

export function otpPepper(): string {
  const pepper = process.env.SHOP_OTP_PEPPER?.trim();
  if (isProductionRuntime() && otpDeliveryConfigured()) {
    if (!pepper || pepper.length < 16 || pepper === "weekendgate-otp") {
      throw new Error(
        "[security] SHOP_OTP_PEPPER must be configured when OTP delivery is enabled",
      );
    }
  }
  return pepper || "weekendgate-otp";
}

export function hashOtp(phone: string, code: string): string {
  return createHmac("sha256", otpPepper()).update(`${phone}:${code}`).digest("hex");
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function otpMatches(phone: string, code: string, entry: UnlockOtpEntry): boolean {
  const a = Buffer.from(entry.codeHash, "utf8");
  const b = Buffer.from(hashOtp(phone, code), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function newGuestPhone(): string {
  return `guest_${randomUUID().replace(/-/g, "")}`;
}

export function buildWebhookEventKey(parts: {
  provider: string;
  intentId: string;
  status: string;
  providerRef?: string;
  eventKey?: string;
}): string {
  if (parts.eventKey) return `${parts.provider}:${parts.eventKey}`;
  return `${parts.provider}:${parts.intentId}:${parts.status}:${parts.providerRef || ""}`;
}

export async function saveUnlockOtp(phone: string, entry: UnlockOtpEntry): Promise<void> {
  const ttlMs = Math.max(1_000, entry.expiresAt - Date.now());
  unlockOtpStore.set(phone, entry);
  await sharedSetJson(`shop:otp:${phone}`, entry, ttlMs);
}

export async function loadUnlockOtp(phone: string): Promise<UnlockOtpEntry | null> {
  const fromShared = await sharedGetJson<UnlockOtpEntry>(`shop:otp:${phone}`);
  if (fromShared) return fromShared;
  return unlockOtpStore.get(phone) || null;
}

export async function clearUnlockOtp(phone: string): Promise<void> {
  unlockOtpStore.delete(phone);
  await sharedDelete(`shop:otp:${phone}`);
}

export async function claimWebhookReceipt(eventKey: string, now = Date.now()): Promise<boolean> {
  const ttlMs = 7 * 24 * 3600_000;
  const claimed = await sharedSetNxJson(`shop:wh:${eventKey}`, { at: now }, ttlMs);
  if (!claimed) return false;
  if (webhookReceiptStore.has(eventKey)) return false;
  webhookReceiptStore.set(eventKey, now);
  if (webhookReceiptStore.size > 5000) {
    const cutoff = now - ttlMs;
    for (const [k, ts] of webhookReceiptStore) {
      if (ts < cutoff) webhookReceiptStore.delete(k);
    }
  }
  return true;
}

export function evaluateUnlockProof(input: {
  hasExisting: boolean;
  accountActive: boolean;
  passwordValid: boolean;
  otpDeliveryReady: boolean;
  production: boolean;
  requireOtp: boolean;
  codePresent: boolean;
  otpValid: boolean;
}):
  | { ok: true; via: "password" | "otp" | "dev_open" }
  | { ok: false; reason: string } {
  if (input.hasExisting && !input.accountActive) {
    return { ok: false, reason: "disabled" };
  }
  if (input.passwordValid) {
    return { ok: true, via: "password" };
  }
  const needsProof = input.hasExisting || input.requireOtp || input.production;
  if (!needsProof) {
    return { ok: true, via: "dev_open" };
  }
  if (!input.otpDeliveryReady) {
    if (input.hasExisting) return { ok: false, reason: "password_required" };
    return { ok: false, reason: "cannot_create_without_proof" };
  }
  if (!input.codePresent) return { ok: false, reason: "code_required" };
  if (!input.otpValid) return { ok: false, reason: "otp_invalid" };
  return { ok: true, via: "otp" };
}
