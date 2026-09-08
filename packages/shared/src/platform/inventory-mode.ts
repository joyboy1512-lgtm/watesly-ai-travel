/** Inventory / booking readiness based on provider + payment env. */

export type InventoryMode = {
  flightProvider: string;
  hotelProvider: string;
  paymentEnv: "sandbox" | "production";
  flightsLive: boolean;
  hotelsLive: boolean;
  paymentsLive: boolean;
};

function envGet(key: string): string | undefined {
  try {
    const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
    return g.process?.env?.[key];
  } catch {
    return undefined;
  }
}

function normalizeProvider(raw: string | undefined | null, fallback: string): string {
  const v = String(raw || "")
    .trim()
    .toLowerCase();
  return v || fallback;
}

function paymentEnv(): "sandbox" | "production" {
  const v = (envGet("PAYMENT_ENV") || envGet("NODE_ENV") || "sandbox").toLowerCase();
  return v === "production" || v === "live" ? "production" : "sandbox";
}

export function getInventoryMode(): InventoryMode {
  const flightProvider = normalizeProvider(envGet("FLIGHT_PROVIDER"), "mock");
  const hotelProvider = normalizeProvider(envGet("HOTEL_PROVIDER"), "mock");
  const pay = paymentEnv();
  return {
    flightProvider,
    hotelProvider,
    paymentEnv: pay,
    flightsLive: flightProvider !== "mock",
    hotelsLive: hotelProvider !== "mock",
    paymentsLive: pay === "production",
  };
}

/** True when flight + hotel providers are non-mock and payments are production. */
export function isLiveBookingReady(): boolean {
  const mode = getInventoryMode();
  return mode.flightsLive && mode.hotelsLive && mode.paymentsLive;
}
