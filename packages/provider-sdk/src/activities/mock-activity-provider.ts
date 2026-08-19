import type { ActivityOffer } from "@watesly-travel/shared";
import { activityTypeLabelAr } from "@watesly-travel/shared";
import { cityDefaultAirport } from "../locations";
import type {
  ActivityProviderAdapter,
  ActivitySearchParams,
  ProviderBookingResult,
} from "../types";
import { amountToMinor } from "../types";

export class MockActivityProvider implements ActivityProviderAdapter {
  readonly providerKey = "mock";
  readonly displayName = "Mock Activities";
  readonly liveMode = false;

  async searchActivities(params: ActivitySearchParams): Promise<ActivityOffer[]> {
    const destination =
      cityDefaultAirport(params.destination) || params.destination.trim() || "DXB";
    const currency = "KWD";
    const fetchedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
    const rows = [
      {
        id: "desert-safari",
        type: "TOUR",
        name: "رحلة صحراوية وعشاء",
        major: 22,
        duration: "نصف يوم",
      },
      {
        id: "city-tour",
        type: "TICKET",
        name: "جولة المدينة والمعالم",
        major: 14,
        duration: "4 ساعات",
      },
      {
        id: "cruise",
        type: "TOUR",
        name: "رحلة بحرية عند الغروب",
        major: 31,
        duration: "3 ساعات",
      },
    ];
    return rows.map((row) => ({
      providerKey: "mock",
      providerOfferRef: `mock-act-${row.id}`,
      description: `${activityTypeLabelAr(row.type)} · ${row.name} · ${destination}`,
      costAmountMinor: amountToMinor(row.major * Math.max(1, params.adults || 1), currency),
      currency,
      revalidationToken: JSON.stringify({ activityCode: row.id }),
      expiresAt,
      raw: {
        provider: "mock",
        liveMode: false,
        source: "mock",
        sourceLabel: "تجريبي",
        fetchedAt,
        activityCode: row.id,
        activityName: row.name,
        activityType: row.type,
        activityTypeLabel: activityTypeLabelAr(row.type),
        destinationCode: destination,
        destinationName: destination,
        summary: row.name,
        durationLabel: row.duration,
        freeCancellation: row.type !== "TICKET",
        description: row.name,
      },
    }));
  }

  async createBooking(
    offer: ActivityOffer,
    _guests?: unknown,
  ): Promise<ProviderBookingResult> {
    return {
      providerBookingRef: `ACT-MOCK-${offer.providerOfferRef.slice(-6)}`,
      status: "confirmed",
    };
  }
}
