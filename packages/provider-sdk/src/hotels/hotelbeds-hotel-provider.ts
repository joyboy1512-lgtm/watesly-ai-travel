import type { HotelOffer, HotelRateOption } from "@watesly-travel/shared";
import { geocodeLocation } from "../locations";
import type {
  HotelProviderAdapter,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
} from "../types";
import { amountToMinor } from "../types";
import {
  hotelbedsHeaders,
  resolveHotelbedsCredentials,
  type HotelbedsCredentials,
} from "./hotelbeds-auth";
import {
  fetchHotelbedsContentMap,
  fetchHotelbedsFacilityCatalog,
} from "./hotelbeds-content-client";
import {
  findMappedRate,
  mapCheckratesToOffer,
  mapHotelbedsToOffer,
} from "./hotelbeds-mapper";
import {
  fetchHotelbedsRateComments,
  rateCommentsFromHb,
} from "./hotelbeds-rate-comments";
import type { HbAvailabilityResponse, HbHotel, HbRate } from "./hotelbeds-types";
import { hotelsFromHotelbedsPayload } from "./hotelbeds-types";
import {
  hotelbedsDisplayCurrency,
  hotelbedsSourceMarket,
} from "./hotelbeds-currency";

function normalizeChildrenAges(children: number, raw?: string): number[] {
  const count = Math.max(0, children);
  if (count === 0) return [];
  const parsed = String(raw || "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 0 && n <= 17);
  if (parsed.length < count) {
    throw new Error("يجب تحديد عمر كل طفل قبل البحث عن الفنادق");
  }
  return parsed.slice(0, count);
}

function firstHbRate(hotel?: HbHotel): HbRate | undefined {
  for (const room of hotel?.rooms || []) {
    for (const rate of room.rates || []) {
      if (rate.rateKey) return rate;
    }
  }
  return undefined;
}

export class HotelbedsHotelProvider implements HotelProviderAdapter {
  readonly providerKey = "hotelbeds";
  readonly displayName = "Hotelbeds Hotels";
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
    const hotelCodeRaw = String(params.hotelCode || "").trim();
    const hotelCodeNum = hotelCodeRaw
      ? Number(hotelCodeRaw.replace(/^hb-/i, ""))
      : NaN;
    const singleHotel =
      Number.isFinite(hotelCodeNum) && hotelCodeNum > 0 ? hotelCodeNum : undefined;

    const geo = await geocodeLocation(params.location);
    if (!geo && !singleHotel) {
      throw new Error(
        `تعذر تحديد موقع «${params.location}» لبحث Hotelbeds. استخدم مدينة معروفة مثل دبي أو الكويت.`,
      );
    }

    const rooms = Math.max(1, params.rooms || 1);
    const children = Math.max(0, params.children || 0);
    const ages = normalizeChildrenAges(children, params.childrenAges);
    const currency = hotelbedsDisplayCurrency(params.currency);
    const sourceMarket = hotelbedsSourceMarket(currency);
    const shiftDays = Math.max(0, Math.min(5, Number(params.shiftDays || 0) || 0));
    const filter: Record<string, unknown> = {
      maxHotels: singleHotel ? 1 : (params.maxHotels ?? 30),
      maxRooms: params.maxRoomsPerHotel ?? (singleHotel ? 50 : 25),
    };
    if (params.minStars) {
      filter.minCategory = String(params.minStars);
      filter.maxCategory = "5EST";
    }
    if (params.maxStars) filter.maxCategory = `${params.maxStars}EST`;
    if (params.minRate && params.minRate > 0) filter.minRate = String(params.minRate);
    if (params.maxRate && params.maxRate > 0) filter.maxRate = String(params.maxRate);
    if (params.paymentType === "AT_HOTEL" || params.paymentType === "AT_WEB") {
      filter.paymentType = params.paymentType;
    }

    const roomOccupancies = Array.isArray(params.roomOccupancies)
      ? params.roomOccupancies.filter((r) => r && Math.max(1, r.adults || 0) >= 1)
      : [];

    let occupancies: Array<Record<string, unknown>>;
    if (roomOccupancies.length > 0) {
      occupancies = roomOccupancies.map((room) => {
        const adults = Math.max(1, room.adults || 1);
        const childAges = (room.childrenAges || [])
          .map((a) => Number(a))
          .filter((a) => Number.isFinite(a) && a >= 0 && a <= 17);
        const childCount = Math.max(
          0,
          room.children != null ? Number(room.children) : childAges.length,
        );
        if (childCount > 0 && childAges.length < childCount) {
          throw new Error("يجب تحديد عمر كل طفل في كل غرفة قبل البحث");
        }
        const agesForRoom = childAges.slice(0, childCount);
        return {
          rooms: 1,
          adults,
          children: agesForRoom.length,
          ...(agesForRoom.length
            ? { paxes: agesForRoom.map((age) => ({ type: "CH", age })) }
            : {}),
        };
      });
    } else {
      occupancies = [
        {
          rooms,
          adults: Math.max(1, params.adults),
          children,
          ...(children > 0
            ? { paxes: ages.map((age) => ({ type: "CH", age })) }
            : {}),
        },
      ];
    }

    const payload: Record<string, unknown> = {
      stay: {
        checkIn: params.checkInDate,
        checkOut: params.checkOutDate,
        ...(shiftDays > 0 ? { shiftDays } : {}),
      },
      occupancies,
      filter,
      language: "ENG",
      sourceMarket,
      dailyRate: true,
    };

    if (singleHotel) {
      payload.hotels = { hotel: [singleHotel] };
    } else if (geo) {
      payload.geolocation = {
        latitude: geo.latitude,
        longitude: geo.longitude,
        radius: params.radiusKm || 25,
        unit: "km",
      };
    }

    if (params.boardCode) {
      payload.boards = { included: true, board: [params.boardCode] };
    }

    const destinationCode = params.location.trim().toUpperCase();
    if (!singleHotel && /^[A-Z]{3}$/.test(destinationCode)) {
      payload.destination = { code: destinationCode };
      delete payload.geolocation;
    }

    const result = await this.request<HbAvailabilityResponse>(
      "/hotel-api/1.0/hotels",
      payload,
    );

    const hotels = hotelsFromHotelbedsPayload(result);
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
        geoLabel: geo?.label || params.location,
        liveMode: this.liveMode,
        expiresAt,
        content,
        facilityCatalog,
        searchCenter: geo
          ? {
              latitude: geo.latitude,
              longitude: geo.longitude,
              label: geo.label,
            }
          : undefined,
      });
      if (offer) offers.push(offer);
    }

    return offers.sort((a, b) => a.costAmountMinor - b.costAmountMinor);
  }

  async fetchRateComments(
    ids: string[],
    date: string,
  ): Promise<Record<string, string>> {
    this.ensureConfigured();
    return fetchHotelbedsRateComments(this.creds, ids, date);
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

    let rateKey = token.rateKey || offer.providerOfferRef;
    if (!rateKey || rateKey.startsWith("hb-")) {
      const options =
        (offer.raw?.rateOptions as Array<{ rateKey?: string; rateType?: string }>) ||
        [];
      const first = options[0];
      if (!first?.rateKey) {
        return {
          available: false,
          priceChanged: false,
          previousCostMinor: offer.costAmountMinor,
          offer,
        };
      }
      rateKey = first.rateKey;
      token.rateKey = first.rateKey;
      token.rateType = first.rateType;
    }

    const previousRate = findMappedRate(offer, rateKey);
    const previousNet = previousRate?.net;
    const previousCostMinor = previousNet
      ? amountToMinor(previousNet, offer.currency)
      : offer.costAmountMinor;

    const checked = await this.request<HbAvailabilityResponse>(
      "/hotel-api/1.0/checkrates",
      { rooms: [{ rateKey }], language: "ENG" },
    );

    const hotel = hotelsFromHotelbedsPayload(checked)[0];
    if (!hotel) {
      return {
        available: false,
        priceChanged: false,
        previousCostMinor,
        offer,
      };
    }

    const nextOffer = mapCheckratesToOffer(offer, hotel, rateKey);
    const selectedRate = findMappedRate(nextOffer, rateKey);
    const hbRate = firstHbRate(hotel);
    let rateComments =
      selectedRate?.rateComments ||
      rateCommentsFromHb(hbRate?.rateComments);

    if (!rateComments && (selectedRate?.rateCommentsId || hbRate?.rateCommentsId)) {
      const date = String(
        nextOffer.raw?.checkInDate || hotel.checkIn || "",
      );
      const comments = await this.fetchRateComments(
        [String(selectedRate?.rateCommentsId || hbRate?.rateCommentsId)],
        date,
      );
      rateComments = Object.values(comments)[0];
      if (rateComments && selectedRate) {
        selectedRate.rateComments = rateComments;
      }
    }

    const nextNet = selectedRate?.net;
    const nextCost = nextNet
      ? amountToMinor(nextNet, offer.currency)
      : nextOffer.costAmountMinor;
    const priceChanged = nextCost !== previousCostMinor;

    return {
      available: true,
      priceChanged,
      previousCostMinor,
      offer: nextOffer,
      selectedRate: selectedRate as HotelRateOption | undefined,
      rateComments,
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
