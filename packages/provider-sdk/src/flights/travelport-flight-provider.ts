import type { FlightOffer } from "@watesly-travel/shared";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";

export type TravelportCreds = {
  username: string;
  password: string;
  targetBranch: string;
  endpoint?: string;
};

/**
 * Travelport GDS adapter scaffold.
 * Wire Universal API / JSON APIs here once enterprise credentials are available.
 */
export class TravelportFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "travelport";
  readonly displayName = "Travelport";
  readonly liveMode: boolean;
  private readonly creds: TravelportCreds;

  constructor(creds?: Partial<TravelportCreds>) {
    this.creds = {
      username:
        creds?.username?.trim() ||
        process.env.TRAVELPORT_USER?.trim() ||
        "",
      password:
        creds?.password?.trim() ||
        process.env.TRAVELPORT_PASSWORD?.trim() ||
        "",
      targetBranch:
        creds?.targetBranch?.trim() ||
        process.env.TRAVELPORT_TARGET_BRANCH?.trim() ||
        "",
      endpoint:
        creds?.endpoint?.trim() ||
        process.env.TRAVELPORT_ENDPOINT?.trim() ||
        "",
    };
    this.liveMode = Boolean(
      this.creds.username && this.creds.password && this.creds.targetBranch,
    );
  }

  private ensureConfigured() {
    if (!this.liveMode) {
      throw new Error(
        "مزود Travelport غير مُعدّ. أدخل Username / Password / Target Branch ثم فعّل FLIGHT_PROVIDER=travelport",
      );
    }
  }

  async searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]> {
    this.ensureConfigured();
    throw new Error(
      "بحث Travelport جاهز للربط — أضف استدعاء Air Search API بمفاتيح المؤسسة. الهيكل والاعتمادات محفوظة.",
    );
  }

  async revalidateOffer(offer: FlightOffer): Promise<FlightRevalidateResult> {
    this.ensureConfigured();
    return {
      available: false,
      offer,
      priceChanged: false,
      previousCostMinor: offer.costAmountMinor,
    };
  }

  async createBooking(
    _offer: FlightOffer,
    _passengers: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error("حجز Travelport غير مفعّل بعد");
  }
}
