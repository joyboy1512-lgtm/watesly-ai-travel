/** Same-origin relative path only — blocks open redirects. */
export function safeNextPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  const value = String(raw || "").trim();
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (/[\s\\]/.test(value)) return fallback;
  if (value.toLowerCase().includes("%2f%2f")) return fallback;
  return value || fallback;
}
