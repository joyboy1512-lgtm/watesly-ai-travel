import type { HotelOffer } from "@watesly-travel/shared";
import type {
  HotelProviderAdapter,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
} from "../types";

const LABELS: Record<string, string> = {
  webbeds: "WebBeds",
  ratehawk: "RateHawk",
  tbo: "TBO",
  didatravel: "DidaTravel",
  arabiabeds: "ArabiaBeds",
};

/**
 * Hotel aggregator adapter scaffold.
 * Search returns [] until live credentials + API mapping are wired.
 * WeekendGate still aggregates whatever suppliers ARE live (e.g. Hotelbeds).
 */
export class ScaffoldHotelProvider implements HotelProviderAdapter {
  readonly providerKey: string;
  readonly displayName: string;
  readonly liveMode = false;

  constructor(providerKey: string) {
    this.providerKey = providerKey;
    this.displayName = LABELS[providerKey] || providerKey;
  }

  async searchHotels(_params: HotelSearchParams): Promise<HotelOffer[]> {
    return [];
  }

  async revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult> {
    return {
      available: false,
      offer,
      priceChanged: false,
      previousCostMinor: offer.costAmountMinor,
    };
  }

  async createBooking(
    _offer: HotelOffer,
    _guests: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(`حجز ${this.displayName} غير مفعّل بعد — اربط مفاتيح API أولاً`);
  }
}

export const HOTEL_AGGREGATOR_KEYS = [
  "webbeds",
  "ratehawk",
  "tbo",
  "didatravel",
  "arabiabeds",
] as const;

export function isHotelAggregatorKey(key: string): boolean {
  return (HOTEL_AGGREGATOR_KEYS as readonly string[]).includes(key);
}
