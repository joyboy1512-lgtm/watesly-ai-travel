/** Shared mock scenario + currency helpers for flight/hotel providers. */

export function scenarioFromOfferRef(ref: string): string | null {
  if (ref.includes("PRICE-CHANGE") || ref.includes("PRICE_CHANGE")) return "price_change";
  if (ref.includes("SOLD-OUT") || ref.includes("SOLD_OUT")) return "sold_out";
  if (ref.includes("PROVIDER-FAIL") || ref.includes("PROVIDER_FAIL")) return "provider_fail";
  if (ref.includes("UNAVAILABLE")) return "unavailable";
  return null;
}

export function toMinorKwd(major: number): number {
  return Math.round(major * 1000);
}

export function currencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  return code === "KWD" || code === "BHD" || code === "OMR" || code === "JOD"
    ? 3
    : 2;
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyExponent(currency));
}
