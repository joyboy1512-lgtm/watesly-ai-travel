export function isQuotaOrRateLimitError(message: string): boolean {
  return /quota has been exceeded|too many requests|rate limit|429/i.test(message);
}

export function isAuthError(message: string): boolean {
  return /unauthorized|forbidden|invalid api|401|403/i.test(message);
}

/** Transient network/timeout — safe for a single retry. Never quota/auth. */
export function isTransientProviderError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : String(err ?? "");
  if (isQuotaOrRateLimitError(message) || isAuthError(message)) return false;
  if (/abort|timeout|etimedout|econnreset|econnrefused|fetch failed|network/i.test(message)) {
    return true;
  }
  if (err && typeof err === "object" && "name" in err && (err as { name?: string }).name === "TimeoutError") {
    return true;
  }
  return false;
}

export function providerErrorCode(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "unknown";
  if (isQuotaOrRateLimitError(message)) return "QUOTA";
  if (isAuthError(message)) return "AUTH";
  if (/abort|timeout/i.test(message)) return "TIMEOUT";
  if (/circuit/i.test(message)) return "CIRCUIT_OPEN";
  return "PROVIDER_ERROR";
}
