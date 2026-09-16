import type { FlightOffer } from "@watesly-travel/shared";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";
import {
  buildTravelportSearchBody,
  mapTravelportCatalogSearch,
} from "./travelport-catalog";

export type TravelportCreds = {
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  targetBranch: string;
  accessGroup?: string;
  endpoint?: string;
  authUrl?: string;
};

type TokenCache = { accessToken: string; expiresAt: number };

const PREPROD_API = "https://api.pp.travelport.net/11";
const PROD_API = "https://api.travelport.net/11";
const PREPROD_AUTH = "https://auth.pp.travelport.net/oauth/token";
const PROD_AUTH = "https://auth.travelport.net/oauth/token";
const SEARCH_PATH = "/air/catalog/search/catalogproductofferings";

function env(name: string): string {
  return process.env[name]?.trim() || "";
}

function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return PREPROD_API;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function authUrlFor(endpoint: string, override?: string): string {
  if (override) return override;
  if (endpoint.includes("api.pp.travelport") || endpoint.includes(".pp.travelport")) {
    return PREPROD_AUTH;
  }
  if (endpoint.includes("api.travelport.net")) return PROD_AUTH;
  return PREPROD_AUTH;
}

function searchUrlFor(endpoint: string): string {
  const base = endpoint.replace(/\/+$/, "");
  if (base.includes("catalogproductofferings")) return base;
  return `${base}${SEARCH_PATH}`;
}

function contentSources(): string[] {
  const raw = env("TRAVELPORT_CONTENT_SOURCE");
  if (!raw) return ["GDS"];
  const list = raw
    .split(/[,\s]+/)
    .map((row) => row.trim().toUpperCase())
    .filter(Boolean);
  return list.length ? list : ["GDS"];
}

function maxUpsells(): number {
  const n = Number(env("TRAVELPORT_UPSELLS") || "4");
  if (!Number.isFinite(n) || n < 0) return 4;
  return Math.min(99, Math.floor(n));
}

/**
 * Travelport TripServices Flights Catalog Search (JSON).
 * https://developer.travelport.com/apis/flights
 *
 * OAuth password grant + POST /air/catalog/search/catalogproductofferings
 * with maxNumberOfUpsellsToReturn so branded fares (Flex / Saver / Comfort)
 * land on the existing fare-family picker.
 */
export class TravelportFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "travelport";
  readonly displayName = "Travelport";
  readonly liveMode: boolean;
  private readonly creds: TravelportCreds;
  private tokenCache: TokenCache | null = null;

  constructor(creds?: Partial<TravelportCreds>) {
    this.creds = {
      username: creds?.username?.trim() || env("TRAVELPORT_USER"),
      password: creds?.password?.trim() || env("TRAVELPORT_PASSWORD"),
      clientId: creds?.clientId?.trim() || env("TRAVELPORT_CLIENT_ID"),
      clientSecret: creds?.clientSecret?.trim() || env("TRAVELPORT_CLIENT_SECRET"),
      targetBranch: creds?.targetBranch?.trim() || env("TRAVELPORT_TARGET_BRANCH"),
      accessGroup: creds?.accessGroup?.trim() || env("TRAVELPORT_ACCESS_GROUP") || undefined,
      endpoint: normalizeEndpoint(
        creds?.endpoint?.trim() || env("TRAVELPORT_ENDPOINT") || PREPROD_API,
      ),
      authUrl: creds?.authUrl?.trim() || env("TRAVELPORT_AUTH_URL") || undefined,
    };
    this.liveMode = Boolean(
      this.creds.username &&
        this.creds.password &&
        this.creds.clientId &&
        this.creds.clientSecret &&
        (this.creds.targetBranch || this.creds.accessGroup),
    );
  }

  private ensureConfigured() {
    if (!this.liveMode) {
      throw new Error(
        "مزود Travelport غير مُعدّ. أدخل Username / Password / Client ID / Client Secret و Target Branch أو Access Group ثم فعّل FLIGHT_PROVIDER=travelport",
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    this.ensureConfigured();
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now() + 30_000) {
      return this.tokenCache.accessToken;
    }
    const url = authUrlFor(this.creds.endpoint || PREPROD_API, this.creds.authUrl);
    const body = new URLSearchParams({
      grant_type: "password",
      username: this.creds.username,
      password: this.creds.password,
      client_id: this.creds.clientId,
      client_secret: this.creds.clientSecret,
    });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
      error?: string;
      message?: string;
    };
    if (!res.ok || !json.access_token) {
      throw new Error(
        json.error_description ||
          json.message ||
          json.error ||
          `فشل توثيق Travelport (HTTP ${res.status})`,
      );
    }
    this.tokenCache = {
      accessToken: json.access_token,
      expiresAt: Date.now() + (json.expires_in || 23 * 3600) * 1000,
    };
    return json.access_token;
  }

  private searchHeaders(token: string): Record<string, string> {
    const version = env("TRAVELPORT_API_VERSION") || "11";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Cache-Control": "no-cache",
      "Accept-Version": version,
      "Content-Version": version,
      TraceId: `wg-${Date.now()}`,
    };
    if (this.creds.targetBranch) {
      headers["TVP-PCC-Core"] = this.creds.targetBranch;
    }
    if (this.creds.accessGroup) {
      headers.XAUTH_TRAVELPORT_ACCESSGROUP = this.creds.accessGroup;
    }
    return headers;
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const origin = params.origin.trim().toUpperCase();
    const destination = params.destination.trim().toUpperCase();
    if (!origin || !destination) {
      throw new Error("أصل ووجهة الرحلة مطلوبان لبحث Travelport");
    }

    const token = await this.getAccessToken();
    const url = searchUrlFor(this.creds.endpoint || PREPROD_API);
    const body = buildTravelportSearchBody(params, {
      maxUpsells: maxUpsells(),
      contentSources: contentSources(),
    });

    const res = await fetch(url, {
      method: "POST",
      headers: this.searchHeaders(token),
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const result = (json.Result || json) as {
        Error?: Array<{ Message?: string }>;
        message?: string;
      };
      const msg =
        result.Error?.[0]?.Message ||
        result.message ||
        (typeof json.message === "string" ? json.message : "") ||
        `فشل بحث Travelport (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return mapTravelportCatalogSearch(json, params);
  }

  async revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult> {
    this.ensureConfigured();
    return {
      available: true,
      offer,
      priceChanged: false,
      previousCostMinor: offer.costAmountMinor,
    };
  }

  async createBooking(
    _offer: FlightOffer,
    _passengers: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(
      "إصدار حجز Travelport غير مفعّل بعد — فعّل AirPrice / Book بعد اعتماد البحث الحي",
    );
  }
}

export { PREPROD_API, PROD_API };
