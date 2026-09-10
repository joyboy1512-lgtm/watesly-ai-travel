/**
 * Production fail-closed helpers. Never log secret values.
 */

export function isProductionRuntime(): boolean {
  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  const paymentEnv = (process.env.PAYMENT_ENV || "").toLowerCase();
  return (
    nodeEnv === "production" ||
    paymentEnv === "production" ||
    paymentEnv === "live"
  );
}

export function requireStrongSecret(
  name: string,
  value: string | undefined | null,
  minLength = 32,
): string {
  const v = String(value || "").trim();
  if (!v || v.length < minLength) {
    throw new Error(
      `[security] ${name} must be set to a strong random value (≥${minLength} chars) in production`,
    );
  }
  const blocked = new Set([
    "dev-only-change-me-watesly-travel",
    "weekendgate-provider-secrets-dev",
    "weekendgate-otp",
    "sandbox-webhook-secret",
    "change-me",
    "secret",
  ]);
  if (blocked.has(v) || blocked.has(v.toLowerCase())) {
    throw new Error(`[security] ${name} must not use a documented default value`);
  }
  return v;
}

/** Call once at API boot in production. */
export function assertProductionSecrets(): void {
  if (!isProductionRuntime()) return;
  requireStrongSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET);
  requireStrongSecret(
    "PROVIDER_SECRETS_KEY",
    process.env.PROVIDER_SECRETS_KEY || process.env.APP_SECRET,
  );
  if (otpDeliveryConfigured()) {
    requireStrongSecret("SHOP_OTP_PEPPER", process.env.SHOP_OTP_PEPPER, 16);
  }
}

export function otpDeliveryConfigured(): boolean {
  const mode = (process.env.SHOP_OTP_DELIVERY || "").trim().toLowerCase();
  if (!mode || mode === "none" || mode === "off") return false;
  if (mode === "log" || mode === "console") {
    return !isProductionRuntime() && process.env.SHOP_OTP_ALLOW_LOG === "1";
  }
  if (mode === "whatsapp") {
    return Boolean(
      process.env.WHATSAPP_TOKEN?.trim() ||
        process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
        process.env.META_WHATSAPP_TOKEN?.trim(),
    );
  }
  if (mode === "http") {
    return Boolean(
      process.env.SHOP_OTP_WEBHOOK_URL?.trim() ||
        process.env.SHOP_OTP_HTTP_URL?.trim(),
    );
  }
  return false;
}

/**
 * Client IP behind Caddy: trust forwarded headers only from private/loopback peers.
 */
export function clientIpFromRequest(req: {
  ip?: string;
  socket?: { remoteAddress?: string };
  headers: Record<string, string | string[] | undefined>;
}): string {
  const remote = String(req.socket?.remoteAddress || req.ip || "").replace(
    /^::ffff:/,
    "",
  );
  const trustedProxy =
    remote === "127.0.0.1" ||
    remote === "::1" ||
    remote.startsWith("10.") ||
    remote.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(remote);

  if (trustedProxy) {
    const xff = req.headers["x-forwarded-for"];
    const raw = Array.isArray(xff) ? xff[0] : xff;
    if (raw) {
      const first = String(raw).split(",")[0]?.trim();
      if (first) return first.replace(/^::ffff:/, "");
    }
    const real = req.headers["x-real-ip"];
    const realIp = Array.isArray(real) ? real[0] : real;
    if (realIp) return String(realIp).trim().replace(/^::ffff:/, "");
  }
  return remote || "unknown";
}
