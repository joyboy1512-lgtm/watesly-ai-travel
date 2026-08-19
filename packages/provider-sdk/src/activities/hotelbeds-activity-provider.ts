import type { ActivityOffer } from "@watesly-travel/shared";
import { activityTypeLabelAr, stripActivityHtml } from "@watesly-travel/shared";
import { cityDefaultAirport } from "../locations";
import type {
  ActivityProviderAdapter,
  ActivitySearchParams,
  ProviderBookingResult,
} from "../types";
import { amountToMinor } from "../types";
import {
  convertHotelbedsAmount,
  hotelbedsDisplayCurrency,
} from "../hotels/hotelbeds-currency";
import {
  hotelbedsHeaders,
  resolveHotelbedsActivityCredentials,
  type HotelbedsCredentials,
} from "../hotels/hotelbeds-auth";
import type {
  HbActivity,
  HbActivityAmount,
  HbActivityName,
  HbActivitySearchResponse,
} from "./hotelbeds-activity-types";

function textOf(value?: HbActivityName | string | null): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.content || "").trim();
}

function activityDestinationCode(query: string): string {
  const raw = query.trim();
  if (!raw) return "";
  const iata = cityDefaultAirport(raw);
  if (iata) return iata;
  if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();
  return raw;
}

function pickAmount(amounts: HbActivityAmount[] | undefined, age: number): number {
  const rows = amounts || [];
  const match =
    rows.find((row) => {
      const from = Number(row.ageFrom ?? 0);
      const to = Number(row.ageTo ?? 999);
      return age >= from && age <= to && Number(row.amount) >= 0;
    }) || rows[0];
  const n = Number(match?.amount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pickImage(activity: HbActivity): string {
  const images = activity.content?.media?.images || [];
  for (const image of images) {
    const urls = image.urls || [];
    const preferred =
      urls.find((u) => u.sizeType === "LARGE2") ||
      urls.find((u) => u.sizeType === "LARGE") ||
      urls.find((u) => u.sizeType === "XLARGE") ||
      urls.find((u) => u.sizeType === "MEDIUM") ||
      urls[0];
    if (preferred?.resource) return preferred.resource;
  }
  return "";
}

function durationLabel(activity: HbActivity): string {
  const duration = activity.modalities?.[0]?.duration;
  const value = Number(duration?.value);
  if (!Number.isFinite(value) || value <= 0) return "";
  const metric = String(duration?.metric || "DAYS").toUpperCase();
  if (metric === "HOURS" || metric === "HOUR") {
    return value === 1 ? "ساعة واحدة" : `${value} ساعات`;
  }
  if (value === 1) return "يوم واحد";
  return `${value} أيام`;
}

function mapActivity(
  activity: HbActivity,
  input: {
    liveMode: boolean;
    destination: string;
    fromDate: string;
    toDate: string;
    adults: number;
    children: number;
    currency: string;
  },
): ActivityOffer | null {
  const code = String(activity.code || "").trim();
  const name =
    textOf(activity.name) ||
    textOf(activity.content?.name) ||
    "نشاط";
  if (!code) return null;
  const providerCurrency = String(activity.currency || "EUR").toUpperCase();
  const displayCurrency = hotelbedsDisplayCurrency(input.currency);
  const amounts = activity.amountsFrom || activity.modalities?.[0]?.amountsFrom;
  const adultRaw = pickAmount(amounts, 30);
  const childRaw = input.children > 0 ? pickAmount(amounts, 8) : 0;
  const totalRaw = adultRaw * input.adults + childRaw * input.children;
  if (!Number.isFinite(totalRaw) || totalRaw < 0) return null;
  const amount = convertHotelbedsAmount(totalRaw, providerCurrency, displayCurrency);
  const dest = activity.country?.destinations?.[0];
  const destinationName = dest?.name || input.destination;
  const destinationCode = dest?.code || input.destination;
  const typeLabel = activityTypeLabelAr(activity.type);
  const summary =
    stripActivityHtml(
      textOf(activity.content?.summary) ||
        textOf(activity.content?.description) ||
        name,
    ) || name;
  const imageUrl = pickImage(activity);
  const freeCancellation = Boolean(activity.modalities?.[0]?.freeCancellation);
  const duration = durationLabel(activity);
  const description = [typeLabel, name, destinationName].filter(Boolean).join(" · ");

  return {
    providerKey: "hotelbeds-activities",
    providerOfferRef: code,
    description,
    costAmountMinor: amountToMinor(amount, displayCurrency),
    currency: displayCurrency,
    revalidationToken: JSON.stringify({
      activityCode: code,
      fromDate: input.fromDate,
      toDate: input.toDate,
    }),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    raw: {
      provider: "hotelbeds-activities",
      liveMode: input.liveMode,
      source: input.liveMode ? "hotelbeds-activities" : "mock",
      sourceLabel: input.liveMode ? "Hotelbeds Activities" : "تجريبي",
      fetchedAt: new Date().toISOString(),
      activityCode: code,
      activityName: name,
      activityType: activity.type,
      activityTypeLabel: typeLabel,
      destinationCode,
      destinationName,
      countryName: activity.country?.name,
      summary,
      durationLabel: duration,
      imageUrl,
      adultFrom: convertHotelbedsAmount(adultRaw, providerCurrency, displayCurrency),
      currency: displayCurrency,
      freeCancellation,
      description: summary,
    },
  };
}

export class HotelbedsActivityProvider implements ActivityProviderAdapter {
  readonly providerKey = "hotelbeds-activities";
  readonly displayName = "Hotelbeds Activities";
  readonly liveMode: boolean;
  private readonly creds: HotelbedsCredentials;

  constructor(creds?: Partial<HotelbedsCredentials>) {
    this.creds = resolveHotelbedsActivityCredentials(creds);
    this.liveMode = Boolean(this.creds.apiKey && this.creds.apiSecret);
  }

  private ensureConfigured() {
    if (!this.creds.apiKey || !this.creds.apiSecret) {
      throw new Error(
        "مزود أنشطة Hotelbeds غير مُعدّ. أدخل HOTELBEDS_ACTIVITY_API_KEY و HOTELBEDS_ACTIVITY_API_SECRET",
      );
    }
  }

  async searchActivities(params: ActivitySearchParams): Promise<ActivityOffer[]> {
    this.ensureConfigured();
    const destination = activityDestinationCode(params.destination);
    if (!destination) {
      throw new Error("حدد وجهة النشاط");
    }
    if (!params.fromDate || !params.toDate) {
      throw new Error("حدد تاريخ البداية والنهاية");
    }
    const adults = Math.max(1, params.adults || 1);
    const children = Math.max(0, params.children || 0);
    const paxes = [
      ...Array.from({ length: adults }, () => ({ age: 30 })),
      ...Array.from({ length: children }, () => ({ age: 8 })),
    ];
    const url = `${this.creds.baseUrl}/activity-api/3.0/activities`;
    const response = await fetch(url, {
      method: "POST",
      headers: hotelbedsHeaders(this.creds),
      body: JSON.stringify({
        filters: [
          {
            searchFilterItems: [{ type: "destination", value: destination }],
          },
        ],
        from: params.fromDate,
        to: params.toDate,
        language: params.language || "en",
        paxes,
        pagination: { itemsPerPage: 24, page: 1 },
        order: "DEFAULT",
      }),
    });
    const json = (await response.json().catch(() => ({}))) as HbActivitySearchResponse;
    if (!response.ok) {
      const detail =
        json.error?.message ||
        json.message ||
        json.errors?.[0]?.text ||
        "";
      throw new Error(
        detail
          ? `تعذر جلب الأنشطة: ${detail}`
          : `تعذر جلب الأنشطة من Hotelbeds (HTTP ${response.status})`,
      );
    }
    const displayCurrency = hotelbedsDisplayCurrency(params.currency);
    return (json.activities || [])
      .map((row) =>
        mapActivity(row, {
          liveMode: this.liveMode,
          destination,
          fromDate: params.fromDate,
          toDate: params.toDate,
          adults,
          children,
          currency: displayCurrency,
        }),
      )
      .filter((row): row is ActivityOffer => Boolean(row))
      .sort((a, b) => a.costAmountMinor - b.costAmountMinor);
  }

  async createBooking(
    _offer: ActivityOffer,
    _guests?: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(
      "حجز أنشطة Hotelbeds الحي غير مفعّل بعد — البحث يعمل عبر Sandbox",
    );
  }
}
