import type { HotelOffer } from "@watesly-travel/shared";
import { DuffelTravelProvider } from "../duffel";
import type {
  HotelProviderAdapter,
  HotelRevalidateResult,
  HotelSearchParams,
  ProviderBookingResult,
} from "../types";

/** Real hotel provider backed by Duffel Stays API. */
export class DuffelHotelProvider implements HotelProviderAdapter {
  readonly providerKey = "duffel";
  readonly displayName = "Duffel Hotels";
  readonly liveMode: boolean;
  private readonly inner: DuffelTravelProvider;

  constructor(token?: string) {
    this.inner = new DuffelTravelProvider(token);
    this.liveMode = this.inner.liveMode;
  }

  searchHotels(params: HotelSearchParams): Promise<HotelOffer[]> {
    return this.inner.searchHotels(params);
  }

  async revalidateOffer(offer: HotelOffer): Promise<HotelRevalidateResult> {
    const result = await this.inner.revalidateOffer(offer);
    return {
      available: result.available,
      priceChanged: result.priceChanged,
      previousCostMinor: result.previousCostMinor,
      offer: result.offer as HotelOffer,
    };
  }

  async createBooking(
    _offer: HotelOffer,
    _guests: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(
      "إصدار حجز فنادق Duffel الحقيقي غير مفعّل بعد — استخدم HOTEL_PROVIDER=mock أو فعّل createBooking لاحقًا",
    );
  }
}
