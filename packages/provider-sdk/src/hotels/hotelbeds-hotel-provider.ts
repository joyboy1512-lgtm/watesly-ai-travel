import type { HotelOffer } from "@watesly-travel/shared";
import { geocodeLocation } from "../locations";
import { amountToMinor } from "../types";
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

type HbRate = {
  rateKey?: string;
  rateType?: string;
  net?: string | number;
  sellingRate?: string | number;
  boardName?: string;
  boardCode?: string;
  cancellationPolicies?: Array<{ amount?: string | number }>;
};

type HbRoom = {
  code?: string;
  name?: string;
  rates?: HbRate[];
};

type HbHotel = {
  code?: number | string;
  name?: string;
  categoryCode?: string;
  categoryName?: string;
  destinationCode?: string;
  destinationName?: string;
  zoneName?: string;
  latitude?: number | string;
  longitude?: number | string;
  currency?: string;
  minRate?: string | number;
  maxRate?: string | number;
  rooms?: HbRoom[];
};

function parseStars(categoryCode?: string): number | undefined {
  if (!categoryCode) return undefined;
  const match = categoryCode.match(/^(\d)/);
  return match ? Number(match[1]) : undefined;
}

function pickBestRate(hotel: HbHotel): {
  rate: HbRate;
  room: HbRoom;
} | null {
  let best: { rate: HbRate; room: HbRoom; price: number } | null = null;
  for (const room of hotel.rooms || []) {
    for (const rate of room.rates || []) {
      const raw = rate.net ?? rate.sellingRate ?? hotel.minRate;
      const price = Number(raw);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (!best || price < best.price) {
        best = { rate, room, price };
      }
    }
  }
  return best ? { rate: best.rate, room: best.room } : null;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms =
    new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

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

  /** Quick connectivity probe (used by provider test UI later). */
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
          children: 0,
        },
      ],
      geolocation: {
        latitude: geo.latitude,
        longitude: geo.longitude,
        radius: params.radiusKm || 25,
        unit: "km",
      },
      filter: {
        maxHotels: 20,
        maxRooms: 3,
      },
      language: "ENG",
      dailyRate: false,
    };

    const destinationCode = params.location.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(destinationCode)) {
      payload.destination = { code: destinationCode };
      delete payload.geolocation;
    }

    const result = await this.request<{
      hotels?: { hotels?: HbHotel[]; total?: number };
    }>("/hotel-api/1.0/hotels", payload);

    const hotels = result.hotels?.hotels || [];
    const nights = nightsBetween(params.checkInDate, params.checkOutDate);
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000).toISOString();

    const offers: HotelOffer[] = [];
    for (const hotel of hotels) {
      const picked = pickBestRate(hotel);
      if (!picked?.rate.rateKey) continue;

      const hotelCurrency = (hotel.currency || currency).toUpperCase();
      const costMajor = Number(
        picked.rate.net ?? picked.rate.sellingRate ?? hotel.minRate ?? 0,
      );
      if (!Number.isFinite(costMajor) || costMajor <= 0) continue;

      const stars = parseStars(hotel.categoryCode);
      const board = picked.rate.boardName || picked.rate.boardCode || "";
      const hotelCode = String(hotel.code || "");
      const description = [
        hotel.name,
        stars ? `${stars}★` : hotel.categoryName,
        picked.room.name,
        board,
        `${nights} ليلة`,
      ]
        .filter(Boolean)
        .join(" · ");

      offers.push({
        providerKey: this.providerKey,
        providerOfferRef: picked.rate.rateKey,
        description,
        costAmountMinor: amountToMinor(costMajor, hotelCurrency),
        currency: hotelCurrency,
        revalidationToken: JSON.stringify({
          rateKey: picked.rate.rateKey,
          hotelCode,
          checkIn: params.checkInDate,
          checkOut: params.checkOutDate,
          rateType: picked.rate.rateType || "BOOKABLE",
        }),
        expiresAt,
        raw: {
          provider: "hotelbeds",
          liveMode: this.liveMode,
          hotelCode,
          hotelName: hotel.name,
          stars,
          categoryName: hotel.categoryName,
          destinationCode: hotel.destinationCode,
          destinationName: hotel.destinationName,
          zoneName: hotel.zoneName,
          board,
          roomName: picked.room.name,
          rateType: picked.rate.rateType,
          net: costMajor,
          currency: hotelCurrency,
          nights,
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          location: geo.label || params.location,
          latitude: hotel.latitude ?? geo.latitude,
          longitude: hotel.longitude ?? geo.longitude,
          freeCancellation: Boolean(
            picked.rate.cancellationPolicies?.some(
              (p) => Number(p.amount || 0) === 0,
            ),
          ),
        },
      });
    }

    return offers.sort((a, b) => a.costAmountMinor - b.costAmountMinor);
  }

  async revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult> {
    let token: {
      rateKey?: string;
      rateType?: string;
    } = {};
    try {
      token = JSON.parse(offer.revalidationToken || "{}") as typeof token;
    } catch {
      token = { rateKey: offer.providerOfferRef };
    }

    const rateKey = token.rateKey || offer.providerOfferRef;
    if (!rateKey) {
      return {
        available: false,
        priceChanged: false,
        previousCostMinor: offer.costAmountMinor,
        offer,
      };
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

    const checked = await this.request<{
      hotels?: { hotels?: HbHotel[] };
    }>("/hotel-api/1.0/checkrates", {
      rooms: [{ rateKey }],
    });

    const hotel = checked.hotels?.hotels?.[0];
    const picked = hotel ? pickBestRate(hotel) : null;
    if (!picked) {
      return {
        available: false,
        priceChanged: false,
        previousCostMinor: offer.costAmountMinor,
        offer,
      };
    }

    const hotelCurrency = (hotel?.currency || offer.currency).toUpperCase();
    const nextMajor = Number(
      picked.rate.net ?? picked.rate.sellingRate ?? hotel?.minRate ?? 0,
    );
    const nextCost = amountToMinor(nextMajor, hotelCurrency);
    const priceChanged = nextCost !== offer.costAmountMinor;

    return {
      available: true,
      priceChanged,
      previousCostMinor: offer.costAmountMinor,
      offer: {
        ...offer,
        providerOfferRef: picked.rate.rateKey || rateKey,
        costAmountMinor: nextCost,
        currency: hotelCurrency,
        expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
        revalidationToken: JSON.stringify({
          rateKey: picked.rate.rateKey || rateKey,
          hotelCode: hotel?.code,
          rateType: picked.rate.rateType || "BOOKABLE",
        }),
        raw: {
          ...offer.raw,
          net: nextMajor,
          rateType: picked.rate.rateType,
          revalidatedAt: new Date().toISOString(),
        },
      },
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
