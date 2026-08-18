import type { HotelOffer } from "@watesly-travel/shared";
import { geocodeLocation } from "../locations";
import type {
  HotelProviderAdapter,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
} from "../types";
import {
  hotelbedsHeaders,
  resolveHotelbedsCredentials,
  type HotelbedsCredentials,
} from "./hotelbeds-auth";
import {
  mapCheckratesToOffer,
  mapHotelbedsToOffer,
} from "./hotelbeds-mapper";
import { fetchHotelbedsContentMap, fetchHotelbedsFacilityCatalog } from "./hotelbeds-content-client";
import type { HbAvailabilityResponse, HbHotel } from "./hotelbeds-types";

export class HotelbedsHotelProvider implements HotelProviderAdapter {
  readonly providerKey = "hotelbeds";
  readonly displayName = "Hotelbeds";
  readonly liveMode: boolean;
  private readonly creds: HotelbedsCredentials;

  constructor(creds?: Partial<HotelbedsCredentials>) {
    this.creds = resolveHotelbedsCredentials(creds);
    this.liveMode = Boolean(this.creds.apiKey && this.creds.apiSecret);
  }

  private ensureConfigured() {
    if (!this.creds.apiKey || !this.creds.apiSecret) {
      throw new Error(
        "مزود Hotelbeds غير مُعدّ. أدخل apiKey و apiSecret في /dashboard/providers أو HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET",
      );
    }
  }

  private async request<T>(
    path: string,
    body?: unknown,
    method: "GET" | "POST" = "POST",
  ): Promise<T> {
    this.ensureConfigured();
    const url = `${this.creds.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      headers: hotelbedsHeaders(this.creds),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const json = (await response.json().catch(() => ({}))) as T & {
      error?: { message?: string; code?: string };
    };
    if (!response.ok) {
      const err = json as { error?: { message?: string }; message?: string };
      throw new Error(
        err.error?.message ||
          err.message ||
          `Hotelbeds HTTP ${response.status}`,
      );
    }
    return json;
  }

  async pingStatus(): Promise<{ ok: boolean; message: string }> {
    try {
      this.ensureConfigured();
      const res = await fetch(`${this.creds.baseUrl}/hotel-api/1.0/status`, {
        headers: hotelbedsHeaders(this.creds),
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: { message?: string };
      };
      if (!res.ok) {
        return {
          ok: false,
          message: json.error?.message || `HTTP ${res.status}`,
        };
      }
      return {
        ok: true,
        message: json.status || "Hotelbeds sandbox متصل",
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "فشل الاتصال",
      };
    }
  }

  async searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
    const geo = await geocodeLocation(params.location);
    if (!geo) {
      throw new Error(
        `تعذر تحديد موقع «${params.location}» لبحث Hotelbeds. استخدم مدينة معروفة مثل دبي أو الكويت.`,
      );
    }

    const rooms = Math.max(1, params.rooms || 1);
    const children = Math.max(0, params.children || 0);
    const currency = (params.currency || "EUR").toUpperCase();
    const payload: Record<string, unknown> = {
      stay: {
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
      },
      occupancies: [
        {
          rooms,
          adults: Math.max(1, params.adults),
          children,
          ...(children > 0 && params.childrenAges
            ? { paxes: params.childrenAges.split(",").map((age) => ({ type: "CH", age: Number(age.trim()) })) }
            : {}),
        },
      ],
      geolocation: {
        latitude: geo.latitude,
        longitude: geo.longitude,
        radius: params.radiusKm || 25,
        unit: "km",
      },
      filter: {
        maxHotels: params.maxHotels ?? 30,
        maxRooms: params.maxRoomsPerHotel ?? 25,
        ...(params.minStars
          ? { minCategory: String(params.minStars), maxCategory: "5EST" }
          : {}),
        ...(params.maxStars
          ? { maxCategory: `${params.maxStars}EST` }
          : {}),
      },
      language: "ENG",
      dailyRate: true,
    };

    const destinationCode = params.location.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(destinationCode)) {
      payload.destination = { code: destinationCode };
      delete payload.geolocation;
    }

    const result = await this.request<HbAvailabilityResponse>(
      "/hotel-api/1.0/hotels",
      payload,
    );

    const hotels = result.hotels?.hotels || [];
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();

    const codes = hotels
      .map((h) => Number(h.code))
      .filter((c) => Number.isFinite(c) && c > 0);
    const [contentMap, facilityCatalog] = await Promise.all([
      fetchHotelbedsContentMap(this.creds, codes),
      fetchHotelbedsFacilityCatalog(this.creds),
    ]);

    const offers: HotelOffer[] = [];
    for (const hotel of hotels) {
      const content = contentMap.get(Number(hotel.code));
      const offer = mapHotelbedsToOffer({
        hotel,
        params: { ...params, currency },
        geoLabel: geo.label || params.location,
        liveMode: this.liveMode,
        expiresAt,
        content,
        facilityCatalog,
        searchCenter: {
          latitude: geo.latitude,
          longitude: geo.longitude,
          label: geo.label,
        },
      });
      if (offer) offers.push(offer);
    }

    return offers.sort((a, b) => a.costAmountMinor - b.costAmountMinor);
  }

  async revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult> {
    let token: {
      rateKey?: string;
      rateType?: string;
      hotelCode?: string;
    } = {};
    try {
      token = JSON.parse(offer.revalidationToken || "{}") as typeof token;
    } catch {
      token = { rateKey: offer.providerOfferRef };
    }

    const rateKey = token.rateKey || offer.providerOfferRef;
    if (!rateKey || rateKey.startsWith("hb-")) {
      const options = (offer.raw?.rateOptions as Array<{ rateKey?: string; rateType?: string }>) || [];
      const first = options[0];
      if (!first?.rateKey) {
        return {
          available: false,
          priceChanged: false,
          previousCostMinor: offer.costAmountMinor,
          offer,
        };
      }
      token.rateKey = first.rateKey;
      token.rateType = first.rateType;
    }

    if ((token.rateType || offer.raw?.rateType) === "BOOKABLE") {
      return {
        available: true,
        priceChanged: false,
        previousCostMinor: offer.costAmountMinor,
        offer: {
          ...offer,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        },
      };
    }

    const checked = await this.request<HbAvailabilityResponse>(
      "/hotel-api/1.0/checkrates",
      { rooms: [{ rateKey: token.rateKey }] },
    );

    const hotel = checked.hotels?.hotels?.[0] as HbHotel | undefined;
    if (!hotel) {
      return {
        available: false,
        priceChanged: false,
        previousCostMinor: offer.costAmountMinor,
        offer,
      };
    }

    const nextOffer = mapCheckratesToOffer(offer, hotel);
    const priceChanged = nextOffer.costAmountMinor !== offer.costAmountMinor;

    return {
      available: true,
      priceChanged,
      previousCostMinor: offer.costAmountMinor,
      offer: nextOffer,
    };
  }

  async createBooking(
    _offer: HotelOffer,
    _guests?: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(
      "حجز Hotelbeds الحي غير مفعّل بعد في WeekendGate — البحث وإعادة التحقق من السعر يعملان عبر Sandbox",
    );
  }
}
