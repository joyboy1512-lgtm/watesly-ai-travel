/**
 * Lightweight security helpers for shop/API surfaces.
 * Secrets must come from Environment / Secret Manager — never commit keys.
 */

const RATE = new Map<string, { count: number; resetAt: number }>();

export function rateLimitOrThrow(
  key: string,
  limit = 30,
  windowMs = 60_000,
): void {
  const now = Date.now();
  const row = RATE.get(key);
  if (!row || now > row.resetAt) {
    RATE.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  row.count += 1;
  if (row.count > limit) {
    throw new Error("RATE_LIMITED");
  }
}

export function sanitizeClientError(message: string): string {
  const m = String(message || "");
  if (/api[_-]?key|secret|password|token|authorization/i.test(m)) {
    return "حدث خطأ في الخدمة. حاول لاحقًا أو تواصل مع الدعم.";
  }
  if (/ECONN|prisma|sql|stack|at\s+\//i.test(m)) {
    return "تعذر إكمال الطلب. حاول مجددًا.";
  }
  return m.slice(0, 280);
}

export function assertIdempotencyKey(key: string | undefined): string {
  const v = String(key || "").trim();
  if (v.length < 8) throw new Error("idempotencyKey مطلوب");
  return v.slice(0, 128);
}

/** Redact PII fragments from log lines. */
export function redactPii(text: string): string {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[phone]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[card]");
}
