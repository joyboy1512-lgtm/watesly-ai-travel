import type { FlightOffer } from "@watesly-travel/shared";
import { normalizeAirlineNameAr } from "@watesly-travel/shared";
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

type DuffelCarrier = { iata_code?: string; name?: string };
type DuffelAirportRef = { iata_code?: string; name?: string; terminal?: string };

type DuffelSegment = {
  originating_airport_iata_code?: string;
  destination_airport_iata_code?: string;
  origin?: DuffelAirportRef;
  destination?: DuffelAirportRef;
  departing_at?: string;
  arriving_at?: string;
  duration?: string;
  marketing_carrier?: DuffelCarrier;
  operating_carrier?: DuffelCarrier;
  marketing_carrier_flight_number?: string;
  operating_carrier_flight_number?: string;
  aircraft?: { name?: string; iata_code?: string };
  passengers?: Array<{ cabin_class_marketing_name?: string }>;
};

type DuffelOffer = {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  expires_at?: string;
  owner?: { name?: string; iata_code?: string };
  slices?: Array<{
    duration?: string;
    segments?: DuffelSegment[];
  }>;
};

function parseIsoDurationMinutes(raw?: string | null): number | null {
  if (!raw || typeof raw !== "string") return null;
  const m = raw.trim().match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return null;
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0);
  const mins = Number(m[3] || 0);
  const secs = Number(m[4] || 0);
  const total = days * 24 * 60 + hours * 60 + mins + Math.round(secs / 60);
  return Number.isFinite(total) ? total : null;
}

function mapDuffelSegment(seg: DuffelSegment) {
  const marketingCode = (seg.marketing_carrier?.iata_code || "").toUpperCase();
  const operatingCode = (seg.operating_carrier?.iata_code || "").toUpperCase();
  const code = marketingCode || operatingCode;
  const flightNumRaw = String(
    seg.marketing_carrier_flight_number ||
      seg.operating_carrier_flight_number ||
      "",
  ).trim();
  let flightNumber: string | undefined;
  if (flightNumRaw) {
    const upper = flightNumRaw.toUpperCase();
    // Already prefixed with a letter IATA (e.g. KU413, U21234) — keep as-is.
    // Pure numeric values like "0641" must get the carrier prefix.
    if (/^[A-Z]{2}\d/.test(upper) || /^[A-Z]\d{2,}/.test(upper)) {
      flightNumber = upper;
    } else if (code && upper.startsWith(code)) {
      flightNumber = upper;
    } else {
      const digits = upper.replace(/^[A-Z]+/, "");
      flightNumber = code ? `${code}${digits || upper}` : upper;
    }
  }

  const from =
    seg.originating_airport_iata_code || seg.origin?.iata_code || "";
  const to =
    seg.destination_airport_iata_code || seg.destination?.iata_code || "";
  const airlineName =
    seg.marketing_carrier?.name ||
    seg.operating_carrier?.name ||
    code;
  const airlineAr = normalizeAirlineNameAr(code, airlineName).ar;

  return {
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    departAt: seg.departing_at || undefined,
    arriveAt: seg.arriving_at || undefined,
    airline: airlineName,
    airlineAr,
    airlineCode: code || undefined,
    marketingAirlineCode: marketingCode || undefined,
    operatingAirlineCode: operatingCode || undefined,
    operatingAirlineName: seg.operating_carrier?.name || undefined,
    flightNumber,
    aircraft: seg.aircraft?.name || seg.aircraft?.iata_code || undefined,
    durationMinutes: parseIsoDurationMinutes(seg.duration) ?? undefined,
    departureTerminal: seg.origin?.terminal || undefined,
    arrivalTerminal: seg.destination?.terminal || undefined,
  };
}

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
    const outSegs = (offer.slices?.[0]?.segments || []).map(mapDuffelSegment);
    const retSegs = (offer.slices?.[1]?.segments || []).map(mapDuffelSegment);
    const firstSeg = outSegs[0];
    const airlineCode = (
      offer.owner?.iata_code ||
      firstSeg?.airlineCode ||
      "XX"
    ).toUpperCase();
    const airlineName =
      offer.owner?.name ||
      firstSeg?.airline ||
      airlineCode;
    const airlineAr = normalizeAirlineNameAr(airlineCode, airlineName).ar;
    const origin = (
      params.origin ||
      firstSeg?.from ||
      ""
    ).toUpperCase();
    const destination = (
      params.destination ||
      outSegs[outSegs.length - 1]?.to ||
      ""
    ).toUpperCase();
    const mode = this.isTestToken() ? "test" : "live";
    const outDuration =
      parseIsoDurationMinutes(offer.slices?.[0]?.duration) ??
      (outSegs.reduce((s, seg) => s + (seg.durationMinutes || 0), 0) || null);
    const retDuration =
      parseIsoDurationMinutes(offer.slices?.[1]?.duration) ??
      (retSegs.reduce((s, seg) => s + (seg.durationMinutes || 0), 0) || null);
    const durationLabel = (mins: number | null) => {
      if (mins == null || mins <= 0) return null;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}س ${m}د` : `${m}د`;
    };

    return {
      providerKey: this.providerKey,
      providerOfferRef: id,
      description: `${airlineAr} ${origin} → ${destination}`,
      costAmountMinor: amountToMinor(total, currency),
      currency: currency as FlightOffer["currency"],
      revalidationToken: id,
      expiresAt:
        offer.expires_at ||
        new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      raw: {
        provider: "duffel",
        mode,
        airline: airlineName,
        airlineAr,
        airlineCode,
        cabin:
          offer.slices?.[0]?.segments?.[0]?.passengers?.[0]
            ?.cabin_class_marketing_name || undefined,
        duration: durationLabel(outDuration),
        durationMinutes: outDuration,
        stops: Math.max(0, outSegs.length - 1),
        departAt: firstSeg?.departAt,
        arriveAt: outSegs[outSegs.length - 1]?.arriveAt,
        segments: outSegs,
        returnSegments: retSegs,
        returnDate: params.returnDate ?? null,
        returnDuration: durationLabel(retDuration),
        returnDurationMinutes: retDuration,
        returnStops: Math.max(0, retSegs.length - 1),
        tripType: retSegs.length ? "roundtrip" : "oneway",
        // Keep nested Duffel payload for revalidate / booking.
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
