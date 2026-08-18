import type { FlightOffer } from "@watesly-travel/shared";
import type {
  FlightProviderAdapter,
  FlightRevalidateResult,
  FlightSearchParams,
  ProviderBookingResult,
} from "../types";

export type TravelfusionCreds = {
  username: string;
  password: string;
  loginId?: string;
};

/**
 * Travelfusion adapter scaffold — covers many LCCs and domestic airlines.
 * XML API endpoints will be wired once login credentials are provided.
 */
export class TravelfusionFlightProvider implements FlightProviderAdapter {
  readonly providerKey = "travelfusion";
  readonly displayName = "Travelfusion";
  readonly liveMode: boolean;
  private readonly creds: TravelfusionCreds;

  constructor(creds?: Partial<TravelfusionCreds>) {
    this.creds = {
      username:
        creds?.username?.trim() ||
        process.env.TRAVELFUSION_USERNAME?.trim() ||
        "",
      password:
        creds?.password?.trim() ||
        process.env.TRAVELFUSION_PASSWORD?.trim() ||
        "",
      loginId:
        creds?.loginId?.trim() ||
        process.env.TRAVELFUSION_LOGIN_ID?.trim() ||
        "",
    };
    this.liveMode = Boolean(this.creds.username && this.creds.password);
  }

  private ensureConfigured() {
    if (!this.liveMode) {
      throw new Error(
        "مزود Travelfusion غير مُعدّ. أدخل Username و Password ثم فعّل FLIGHT_PROVIDER=travelfusion",
      );
    }
  }

  async searchFlights(_params: FlightSearchParams): Promise<FlightOffer[]> {
    this.ensureConfigured();
    throw new Error(
      "بحث Travelfusion جاهز للربط (LCC + داخلي) — أضف StartRouting / CheckRouting XML بعد تزويد بيانات الدخول.",
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
    throw new Error("حجز Travelfusion غير مفعّل بعد");
  }
}
