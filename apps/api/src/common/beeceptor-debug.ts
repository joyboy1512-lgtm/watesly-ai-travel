/** Optional fire-and-forget traces to a Beeceptor (or similar) inspector. */

const SENSITIVE = /(key|secret|token|password|authorization|signature|cookie)/i;

function debugBaseUrl(): string {
  return (process.env.BEECEPTOR_DEBUG_URL || "").trim().replace(/\/$/, "");
}

export function sanitizeDebugPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE.test(key)) continue;
    if (typeof value === "string") {
      out[key] = value.slice(0, 240);
    } else if (typeof value === "number" || typeof value === "boolean" || value == null) {
      out[key] = value;
    } else if (Array.isArray(value)) {
      out[key] = value.length;
    } else {
      out[key] = "[object]";
    }
  }
  return out;
}

export function postBeeceptorDebug(
  path: string,
  payload: Record<string, unknown>,
): void {
  const base = debugBaseUrl();
  if (!base) return;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const body = JSON.stringify({
    ...sanitizeDebugPayload(payload),
    at: new Date().toISOString(),
    source: "weekendgate-api",
  });
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(4000),
  }).catch(() => {
    /* inspector is best-effort */
  });
}
