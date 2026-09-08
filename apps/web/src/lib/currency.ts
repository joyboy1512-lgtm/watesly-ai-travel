const CURRENCY_KEY = "weekendgate_preferred_currency";

export function getPreferredCurrency(fallback = "KWD"): string {
  if (typeof window === "undefined") return fallback;
  try {
    return localStorage.getItem(CURRENCY_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function setPreferredCurrency(code: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENCY_KEY, code.toUpperCase());
  } catch {
    /* ignore */
  }
}
