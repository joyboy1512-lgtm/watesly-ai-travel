import type { FlightOffer } from "@watesly-travel/shared";
import { amountToMinor } from "../types";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";

const DUFFEL_API = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

type DuffelPassengerType = "adult" | "child" | "infant_without_seat";

type DuffelOffer = {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  expires_at?: string;
  owner?: { name?: string; iata_code?: string };
  slices?: Array<{
    duration?: string;
    segments?: Array<{
      originating_airport_iata_code?: string;
      destination_airport_iata_code?: string;
      departing_at?: string;
      arriving_at?: string;
      marketing_carrier?: { iata_code?: string; name?: string };
      marketing_carrier_flight_number?: string;
    }>;
  }>;
};

/**
 * Duffel Flights — live/test via DUFFEL_ACCESS_TOKEN (duffel_test_… or duffel_live_…).
 * Search uses Offer Requests; booking create is staged (not auto-ticketed).
 */
export class DuffelFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "duffel";
  readonly displayName = "Duffel";
  readonly liveMode: boolean;
  private readonly accessToken: string;

  constructor(token?: string) {
    this.accessToken =
      token?.trim() || process.env.DUFFEL_ACCESS_TOKEN?.trim() || "";
    this.liveMode = Boolean(this.accessToken);
  }

  private ensureConfigured() {
    if (!this.accessToken) {
      throw new Error(
        "مزود Duffel غير مُعدّ. أدخل Access Token أو عيّن DUFFEL_ACCESS_TOKEN (duffel_test_… أو duffel_live_…)",
      );
    }
  }

  private isTestToken() {
    return this.accessToken.startsWith("duffel_test_");
  }

  private headers(json = true): Record<string, string> {
    const h: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Duffel-Version": DUFFEL_VERSION,
      Accept: "application/json",
    };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  private cabinClass(cabin?: string | null) {
    const c = (cabin || "economy").toLowerCase();
    if (c.includes("first")) return "first";
    if (c.includes("business")) return "business";
    if (c.includes("premium")) return "premium_economy";
    return "economy";
  }

  private buildPassengers(params: FlightSearchParams) {
    const passengers: Array<{ type: DuffelPassengerType }> = [];
    const adults = Math.max(1, params.adults || 1);
    for (let i = 0; i < adults; i += 1) passengers.push({ type: "adult" });
    for (let i = 0; i < (params.children || 0); i += 1) {
      passengers.push({ type: "child" });
    }
    for (let i = 0; i < (params.infants || 0); i += 1) {
      passengers.push({ type: "infant_without_seat" });
    }
    return passengers;
  }

  private async duffelFetch<T>(
    path: string,
    init?: RequestInit,
  ): Promise<{ ok: boolean; status: number; json: T }> {
    this.ensureConfigured();
    const res = await fetch(`${DUFFEL_API}${path}`, {
      ...init,
      headers: {
        ...this.headers(Boolean(init?.body)),
        ...(init?.headers || {}),
      },
    });
    const json = (await res.json().catch(() => ({}))) as T;
    return { ok: res.ok, status: res.status, json };
  }

  private mapOffer(
    offer: DuffelOffer,
    params: FlightSearchParams,
    index: number,
  ): FlightOffer {
    const currency = (offer.total_currency || params.currency || "KWD").toUpperCase();
    const total = offer.total_amount || "0";
    const id = String(offer.id || `duffel_${index}`);
    const owner =
      offer.owner?.iata_code ||
      offer.slices?.[0]?.segments?.[0]?.marketing_carrier?.iata_code ||
      "XX";
    const origin = params.origin.toUpperCase();
    const destination = params.destination.toUpperCase();
    const mode = this.isTestToken() ? "test" : "live";
    return {
      providerKey: this.providerKey,
      providerOfferRef: id,
      description: `Duffel · ${String(owner).toUpperCase()} · ${origin}→${destination}`,
      costAmountMinor: amountToMinor(total, currency),
      currency: currency as FlightOffer["currency"],
      revalidationToken: id,
      expiresAt:
        offer.expires_at ||
        new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      raw: {
        provider: "duffel",
        mode,
        offer,
      },
    };
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    const origin = params.origin.trim().toUpperCase();
    const destination = params.destination.trim().toUpperCase();
    if (!origin || !destination) {
      throw new Error("أصل ووجهة الرحلة مطلوبان لبحث Duffel");
    }

    const slices: Array<{
      origin: string;
      destination: string;
      departure_date: string;
    }> = [
      {
        origin,
        destination,
        departure_date: params.departDate.slice(0, 10),
      },
    ];
    if (params.returnDate) {
      slices.push({
        origin: destination,
        destination: origin,
        departure_date: params.returnDate.slice(0, 10),
      });
    }

    const body = {
      data: {
        slices,
        passengers: this.buildPassengers(params),
        cabin_class: this.cabinClass(params.cabinClass),
      },
    };

    const { ok, status, json } = await this.duffelFetch<{
      data?: { offers?: DuffelOffer[]; id?: string };
      errors?: Array<{ title?: string; message?: string; detail?: string }>;
    }>("/air/offer_requests?return_offers=true", {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (!ok) {
      const err = json.errors?.[0];
      throw new Error(
        err?.message ||
          err?.detail ||
          err?.title ||
          `فشل بحث Duffel (HTTP ${status})`,
      );
    }

    const offers = Array.isArray(json.data?.offers) ? json.data!.offers! : [];
    return offers.slice(0, 40).map((offer, index) => this.mapOffer(offer, params, index));
  }

  async revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult> {
    const offerId = offer.providerOfferRef || offer.revalidationToken;
    if (!offerId) {
      return { available: false, offer, priceChanged: false };
    }

    const { ok, json } = await this.duffelFetch<{
      data?: DuffelOffer;
      errors?: Array<{ title?: string; message?: string }>;
    }>(`/air/offers/${encodeURIComponent(offerId)}`, { method: "GET" });

    if (!ok || !json.data?.id) {
      return { available: false, offer, priceChanged: false };
    }

    const refreshed = this.mapOffer(json.data, {
      origin: "",
      destination: "",
      departDate: new Date().toISOString().slice(0, 10),
      adults: 1,
      currency: offer.currency,
    }, 0);

    // Keep route description from original when revalidate payload is thin
    refreshed.description = offer.description || refreshed.description;
    const priceChanged = refreshed.costAmountMinor !== offer.costAmountMinor;
    return {
      available: true,
      offer: {
        ...refreshed,
        description: offer.description,
        raw: {
          ...(typeof refreshed.raw === "object" ? refreshed.raw : {}),
          previousOfferRef: offer.providerOfferRef,
        },
      },
      priceChanged,
      previousCostMinor: offer.costAmountMinor,
    };
  }

  async createBooking(
    _offer: FlightOffer,
    _passengers: unknown,
  ): Promise<ProviderBookingResult> {
    // Keep booking staged: Duffel Orders need passenger PII + payment flow.
    throw new Error(
      this.isTestToken()
        ? "بحث Duffel (Test) مفعّل — إصدار التذكرة عبر Orders يحتاج استكمال بيانات المسافرين والدفع لاحقاً"
        : "إصدار حجز Duffel غير مفعّل بعد — فعّل Air Orders بعد اعتماد الحساب الحي",
    );
  }
}
