/** Parse Hotelbeds JSON error bodies. Their 403 quota payload is `{ "error": "Quota exceeded" }`. */

export function hotelbedsResponseError(json: unknown, status: number): string {
  const obj = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const err = obj.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const nested = (err as { message?: unknown }).message;
    if (typeof nested === "string" && nested.trim()) return nested.trim();
  }
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  return `Hotelbeds HTTP ${status}`;
}

export function isHotelbedsQuotaError(message: string): boolean {
  return /quota exceeded|quota has been exceeded|too many requests|rate limit|تجاوز حد طلبات/i.test(
    String(message || ""),
  );
}
