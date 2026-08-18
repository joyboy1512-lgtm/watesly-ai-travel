import { CompositeTravelProvider } from "./composite";
import { AmadeusFlightProvider } from "./flights/amadeus-flight-provider";
import { DuffelFlightProvider } from "./flights/duffel-flight-provider";
import { MockFlightProvider } from "./flights/mock-flight-provider";
import { TravelfusionFlightProvider } from "./flights/travelfusion-flight-provider";
import { TravelportFlightProvider } from "./flights/travelport-flight-provider";
import { DuffelHotelProvider } from "./hotels/duffel-hotel-provider";
import { HotelbedsHotelProvider } from "./hotels/hotelbeds-hotel-provider";
import { MockHotelProvider } from "./hotels/mock-hotel-provider";
import { HotelbedsTransferProvider } from "./transfers/hotelbeds-transfer-provider";
import { MockTransferProvider } from "./transfers/mock-transfer-provider";
import type {
  FlightProviderAdapter,
  HotelProviderAdapter,
  TransferProviderAdapter,
  TravelProviderAdapter,
} from "./types";

function mockFallbackAllowed(): boolean {
  return process.env.TRAVEL_MOCK_ENABLED !== "false";
}

function normalizeProviderAlias(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "mock";
  // "real" is a generic alias for the project's primary live API (Duffel today).
  if (key === "real") return "duffel";
  // Common aliases for low-cost / domestic aggregator
  if (key === "tf" || key === "lcc") return "travelfusion";
  if (key === "tp" || key === "galileo") return "travelport";
  if (
    key === "hotelbeds-transfers" ||
    key === "hotelbeds_transfers" ||
    key === "hotelbeds-transfer" ||
    key === "hotelbeds_transfer"
  ) {
    return "hotelbeds-transfers";
  }
  return key;
}

export function isHotelbedsTransferKey(raw?: string): boolean {
  const key = normalizeProviderAlias(raw || "");
  return key === "hotelbeds-transfers";
}

/**
 * Resolve flight provider key.
 * Priority: explicit preferred → FLIGHT_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
export function resolveFlightProviderKey(preferred?: string): string {
  const fromEnv =
    process.env.FLIGHT_PROVIDER?.trim() ||
    process.env.TRAVEL_DEFAULT_PROVIDER?.trim() ||
    "mock";
  return normalizeProviderAlias(preferred || fromEnv);
}

/**
 * Resolve hotel provider key.
 * Priority: explicit preferred → HOTEL_PROVIDER → TRAVEL_DEFAULT_PROVIDER → mock
 */
export function resolveHotelProviderKey(preferred?: string): string {
  const fromEnv =
    process.env.HOTEL_PROVIDER?.trim() ||
    process.env.TRAVEL_DEFAULT_PROVIDER?.trim() ||
    "mock";
  return normalizeProviderAlias(preferred || fromEnv);
}

export function resolveTransferProviderKey(preferred?: string): string {
  const fromEnv =
    process.env.TRANSFER_PROVIDER?.trim() ||
    (process.env.HOTELBEDS_TRANSFER_API_KEY?.trim()
      ? "hotelbeds-transfers"
      : "") ||
    "mock";
  const key = normalizeProviderAlias(preferred || fromEnv);
  // TRANSFER_PROVIDER=hotelbeds means the Transfers API, never the Hotels API.
  if (key === "hotelbeds") return "hotelbeds-transfers";
  return key;
}

/** @deprecated Use resolveFlightProviderKey / resolveHotelProviderKey */
export function resolveProviderKey(preferred?: string): string {
  const fromEnv = process.env.TRAVEL_DEFAULT_PROVIDER?.trim();
  return normalizeProviderAlias(preferred || fromEnv || "mock");
}

type HotelProviderCreds = {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  accessToken?: string;
};

export type FlightProviderCreds = {
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  hostname?: string;
  username?: string;
  password?: string;
  targetBranch?: string;
  endpoint?: string;
  loginId?: string;
};

function requireDuffelToken(kind: "flight" | "hotel"): string {
  const token = process.env.DUFFEL_ACCESS_TOKEN?.trim();
  if (token) return token;
  throw new Error(
    kind === "flight"
      ? "FLIGHT_PROVIDER=duffel/real يتطلب DUFFEL_ACCESS_TOKEN في .env"
      : "HOTEL_PROVIDER=duffel/real يتطلب DUFFEL_ACCESS_TOKEN في .env",
  );
}

export function getFlightProvider(
  preferred?: string,
  creds?: FlightProviderCreds,
): FlightProviderAdapter {
  const key = resolveFlightProviderKey(preferred);

  if (key === "mock") {
    return new MockFlightProvider();
  }

  if (key === "duffel") {
    try {
      const token = creds?.accessToken?.trim() || requireDuffelToken("flight");
      return new DuffelFlightProvider(token);
    } catch (err) {
      if (mockFallbackAllowed()) return new MockFlightProvider();
      throw err;
    }
  }

  if (key === "amadeus") {
    try {
      const provider = new AmadeusFlightProvider({
        clientId: creds?.clientId,
        clientSecret: creds?.clientSecret,
        hostname: creds?.hostname,
      });
      if (!provider.liveMode) {
        throw new Error(
          "FLIGHT_PROVIDER=amadeus يتطلب AMADEUS_CLIENT_ID و AMADEUS_CLIENT_SECRET",
        );
      }
      return provider;
    } catch (err) {
      if (mockFallbackAllowed()) return new MockFlightProvider();
      throw err;
    }
  }

  if (key === "travelport") {
    try {
      const provider = new TravelportFlightProvider({
        username: creds?.username,
        password: creds?.password,
        targetBranch: creds?.targetBranch,
        endpoint: creds?.endpoint,
      });
      if (!provider.liveMode) {
        throw new Error(
          "FLIGHT_PROVIDER=travelport يتطلب TRAVELPORT_USER و TRAVELPORT_PASSWORD و TRAVELPORT_TARGET_BRANCH",
        );
      }
      return provider;
    } catch (err) {
      if (mockFallbackAllowed()) return new MockFlightProvider();
      throw err;
    }
  }

  if (key === "travelfusion") {
    try {
      const provider = new TravelfusionFlightProvider({
        username: creds?.username,
        password: creds?.password,
        loginId: creds?.loginId,
      });
      if (!provider.liveMode) {
        throw new Error(
          "FLIGHT_PROVIDER=travelfusion يتطلب TRAVELFUSION_USERNAME و TRAVELFUSION_PASSWORD",
        );
      }
      return provider;
    } catch (err) {
      if (mockFallbackAllowed()) return new MockFlightProvider();
      throw err;
    }
  }

  if (mockFallbackAllowed()) return new MockFlightProvider();
  throw new Error(`مزود طيران غير معروف: ${key}`);
}

export function getHotelProvider(
  preferred?: string,
  creds?: HotelProviderCreds,
): HotelProviderAdapter {
  const key = resolveHotelProviderKey(preferred);

  if (key === "mock") {
    return new MockHotelProvider();
  }

  if (key === "duffel") {
    try {
      const token =
        creds?.accessToken?.trim() || requireDuffelToken("hotel");
      return new DuffelHotelProvider(token);
    } catch (err) {
      if (mockFallbackAllowed()) return new MockHotelProvider();
      throw err;
    }
  }

  if (key === "hotelbeds") {
    try {
      const provider = new HotelbedsHotelProvider({
        apiKey: creds?.apiKey,
        apiSecret: creds?.apiSecret,
        baseUrl: creds?.baseUrl,
      });
      if (!provider.liveMode) {
        throw new Error(
          "HOTEL_PROVIDER=hotelbeds يتطلب HOTELBEDS_API_KEY و HOTELBEDS_API_SECRET",
        );
      }
      return provider;
    } catch (err) {
      if (mockFallbackAllowed()) return new MockHotelProvider();
      throw err;
    }
  }

  // Flight-only / transfer-only keys are not hotel adapters.
  if (mockFallbackAllowed()) return new MockHotelProvider();
  throw new Error(`مزود فنادق غير معروف: ${key}`);
}

export function getTransferProvider(
  preferred?: string,
  creds?: HotelProviderCreds,
): TransferProviderAdapter {
  const key = resolveTransferProviderKey(preferred);

  if (key === "mock") {
    return new MockTransferProvider();
  }

  if (key === "hotelbeds" || key === "hotelbeds-transfers") {
    try {
      const provider = new HotelbedsTransferProvider({
        apiKey: creds?.apiKey,
        apiSecret: creds?.apiSecret,
        baseUrl: creds?.baseUrl,
      });
      if (!provider.liveMode) {
        throw new Error(
          "TRANSFER_PROVIDER=hotelbeds-transfers يتطلب HOTELBEDS_TRANSFER_API_KEY و HOTELBEDS_TRANSFER_API_SECRET",
        );
      }
      return provider;
    } catch (err) {
      if (mockFallbackAllowed()) return new MockTransferProvider();
      throw err;
    }
  }

  if (mockFallbackAllowed()) return new MockTransferProvider();
  throw new Error(`مزود مواصلات غير معروف: ${key}`);
}

/**
 * Legacy combined provider.
 * - With preferred key: both sides use that key (quote/booking revalidate).
 * - Without preferred: FLIGHT_PROVIDER and HOTEL_PROVIDER resolve independently.
 */
export function getTravelProvider(preferred?: string): TravelProviderAdapter {
  if (preferred?.trim()) {
    const key = normalizeProviderAlias(preferred);
    return new CompositeTravelProvider(
      getFlightProvider(key),
      getHotelProvider(key),
    );
  }
  return new CompositeTravelProvider(getFlightProvider(), getHotelProvider());
}
