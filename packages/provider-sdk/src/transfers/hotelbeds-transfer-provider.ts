import type { TransferOffer } from "@watesly-travel/shared";
import { transferTypeLabelAr } from "@watesly-travel/shared";
import {
  cityDefaultAirport,
  geocodeLocation,
  resolveGeoLocation,
} from "../locations";
import type {
  ProviderBookingResult,
  TransferProviderAdapter,
  TransferSearchParams,
} from "../types";
import { amountToMinor } from "../types";
import {
  convertHotelbedsAmount,
  hotelbedsDisplayCurrency,
} from "../hotels/hotelbeds-currency";
import {
  hotelbedsHeaders,
  resolveHotelbedsTransferCredentials,
  type HotelbedsCredentials,
} from "../hotels/hotelbeds-auth";
import type {
  HbTransferAvailabilityResponse,
  HbTransferName,
  HbTransferService,
} from "./hotelbeds-transfer-types";

export type TransferEndpoint = {
  type: "IATA" | "ATLAS" | "GPS";
  code: string;
  label: string;
};

export type ResolveTransferEndpointInput = {
  query: string;
  kind: "IATA" | "ATLAS" | "GPS";
  city?: string;
};

function textOf(value?: string | HbTransferName): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return String(value.content || "").trim();
}

function normalizeTime(raw?: string): string {
  const t = String(raw || "10:00").trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t.slice(0, 5);
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return "10:00";
}

function datetimeStamp(date: string, time?: string): string {
  return `${date}T${normalizeTime(time)}:00`;
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

export async function resolveTransferEndpoint(
  input: ResolveTransferEndpointInput,
): Promise<TransferEndpoint> {
  const raw = input.query.trim();
  const city = input.city?.trim() || "";
  const kind = input.kind;

  if (kind === "IATA") {
    const code = raw.toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) {
      return { type: "IATA", code, label: code };
    }
    const fromCity = cityDefaultAirport(city || raw);
    if (fromCity) {
      return { type: "IATA", code: fromCity, label: fromCity };
    }
    throw new Error(
      "حدد مطاراً برمز IATA (مثل KWI) أو اختر مدينة لها مطار معروف",
    );
  }

  if (kind === "ATLAS") {
    const code = raw.replace(/^hb-/i, "");
    if (/^\d+$/.test(code)) {
      return { type: "ATLAS", code, label: raw || code };
    }
    throw new Error("اختر فندقاً محدداً من قائمة الفنادق");
  }

  const geoQuery =
    raw && city ? `${raw}, ${city}` : raw || city;
  if (!geoQuery) {
    throw new Error("حدد العنوان أو الحي");
  }
  const known = resolveGeoLocation(geoQuery) || resolveGeoLocation(city);
  const geo = known || (await geocodeLocation(geoQuery));
  if (!geo) {
    throw new Error(
      `تعذر تحديد موقع «${geoQuery}». أدخل حيّاً أو عنواناً أو اسم مدينة.`,
    );
  }
  return {
    type: "GPS",
    code: `${geo.latitude.toFixed(5)},${geo.longitude.toFixed(5)}`,
    label: raw || geo.label || city,
  };
}

function sameTransferPoint(a: TransferEndpoint, b: TransferEndpoint) {
  return a.type === b.type && a.code.trim().toUpperCase() === b.code.trim().toUpperCase();
}

/**
 * Hotelbeds Transfers needs two distinct points (airport ↔ the chosen hotel).
 * Never rewrite a search into "airport → any hotel / city center".
 */
export async function ensureDistinctTransferEndpoints(
  from: TransferEndpoint,
  to: TransferEndpoint,
): Promise<{ from: TransferEndpoint; to: TransferEndpoint }> {
  if (!sameTransferPoint(from, to)) return { from, to };
  throw new Error(
    "حدد المطار والفندق كنقطتين مختلفتين. النقل إلى الفندق الذي تختاره، وليس إلى أي فندق.",
  );
}

/** @deprecated Use resolveTransferEndpoint with explicit kind. */
export async function resolveTransferEndpointLegacy(
  query: string,
): Promise<TransferEndpoint> {
  const raw = query.trim();
  if (!raw) {
    throw new Error("حدد نقطة الاستلام أو التسليم");
  }
  const code = raw.toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) {
    return { type: "IATA", code, label: code };
  }
  return resolveTransferEndpoint({ query: raw, kind: "GPS" });
}

function mapService(
  service: HbTransferService,
  input: {
    from: TransferEndpoint;
    to: TransferEndpoint;
    liveMode: boolean;
    outboundAt: string;
    inboundAt?: string;
    city?: string;
    currency?: string;
  },
): TransferOffer | null {
  const rateKey = String(service.rateKey || "").trim();
  const providerCurrency = String(service.price?.currencyId || "EUR").toUpperCase();
  const displayCurrency = hotelbedsDisplayCurrency(input.currency);
  const amountRaw = Number(service.price?.totalAmount ?? service.price?.netAmount ?? 0);
  if (!rateKey || !Number.isFinite(amountRaw) || amountRaw <= 0) return null;
  const amount = convertHotelbedsAmount(amountRaw, providerCurrency, displayCurrency);
  const currency = displayCurrency;
  const transferType = String(service.transferType || "PRIVATE").toUpperCase();
  const vehicleName =
    textOf(service.vehicle?.name) || String(service.vehicle?.code || "مركبة");
  const categoryName = textOf(service.category?.name);
  const fromLabel =
    textOf(service.pickupInformation?.from?.description) || input.from.label;
  const toLabel =
    textOf(service.pickupInformation?.to?.description) || input.to.label;
  const cancel = service.cancellationPolicies?.[0];
  const cancelAmount = convertHotelbedsAmount(
    Number(cancel?.amount ?? 0),
    providerCurrency,
    displayCurrency,
  );
  const imageUrl = service.content?.images?.find((img) => img.url)?.url;
  const detail = service.content?.transferDetailInfo?.[0]?.description;
  const sourceLabel = input.liveMode ? "Hotelbeds Transfers" : "تجريبي";
  const fetchedAt = new Date().toISOString();
  const typeLabel = transferTypeLabelAr(transferType);
  const maxPax = service.maxPaxCapacity;
  const description = [typeLabel, vehicleName, categoryName, fromLabel, toLabel]
    .filter(Boolean)
    .join(" · ");

  return {
    providerKey: "hotelbeds-transfers",
    providerOfferRef: rateKey,
    description,
    costAmountMinor: amountToMinor(amount, currency),
    currency,
    revalidationToken: JSON.stringify({ rateKey, transferType }),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    raw: {
      provider: "hotelbeds-transfers",
      liveMode: input.liveMode,
      source: input.liveMode ? "hotelbeds-transfers" : "mock",
      sourceLabel,
      fetchedAt,
      rateKey,
      transferType,
      transferTypeLabel: typeLabel,
      vehicleCode: service.vehicle?.code,
      vehicleName,
      categoryCode: service.category?.code,
      categoryName,
      direction: service.direction,
      fromLabel,
      toLabel,
      fromType: input.from.type,
      toType: input.to.type,
      city: input.city,
      outboundAt: input.outboundAt,
      inboundAt: input.inboundAt,
      minPax: service.minPaxCapacity,
      maxPax,
      imageUrl,
      freeCancellation: Number.isFinite(cancelAmount) && cancelAmount === 0,
      cancellationFrom: cancel?.from,
      cancellationAmount: Number.isFinite(cancelAmount) ? cancelAmount : undefined,
      description: detail || description,
    },
  };
}

export class HotelbedsTransferProvider implements TransferProviderAdapter {
  readonly providerKey = "hotelbeds-transfers";
  readonly displayName = "Hotelbeds Transfers";
  readonly liveMode: boolean;
  private readonly creds: HotelbedsCredentials;

  constructor(creds?: Partial<HotelbedsCredentials>) {
    this.creds = resolveHotelbedsTransferCredentials(creds);
    this.liveMode = Boolean(this.creds.apiKey && this.creds.apiSecret);
  }

  private ensureConfigured() {
    if (!this.creds.apiKey || !this.creds.apiSecret) {
      throw new Error(
        "مزود مواصلات Hotelbeds غير مُعدّ. أدخل HOTELBEDS_TRANSFER_API_KEY و HOTELBEDS_TRANSFER_API_SECRET",
      );
    }
  }

  private async fetchAvailability(input: {
    from: TransferEndpoint;
    to: TransferEndpoint;
    outboundAt: string;
    inboundAt?: string;
    adults: number;
    children: number;
    infants: number;
    city?: string;
    currency?: string;
  }): Promise<TransferOffer[]> {
    const pathParts = [
      "/transfer-api/1.0/availability/en/from",
      input.from.type,
      encodeSegment(input.from.code),
      "to",
      input.to.type,
      encodeSegment(input.to.code),
      input.outboundAt,
    ];
    if (input.inboundAt) pathParts.push(input.inboundAt);
    pathParts.push(
      String(input.adults),
      String(input.children),
      String(input.infants),
    );
    const url = `${this.creds.baseUrl}${pathParts.join("/")}`;
    const response = await fetch(url, { headers: hotelbedsHeaders(this.creds) });
    const json = (await response.json().catch(() => ({}))) as HbTransferAvailabilityResponse & {
      message?: string;
    };
    if (!response.ok) {
      if (response.status === 400 || response.status === 404) return [];
      const detail =
        json.error?.message ||
        json.message ||
        (typeof json.error === "string" ? json.error : "") ||
        "";
      throw new Error(
        detail
          ? `تعذر جلب النقل: ${detail}`
          : `تعذر جلب النقل من Hotelbeds (HTTP ${response.status})`,
      );
    }
    return (json.services || [])
      .map((service) =>
        mapService(service, {
          from: input.from,
          to: input.to,
          liveMode: this.liveMode,
          outboundAt: input.outboundAt,
          inboundAt: input.inboundAt,
          city: input.city,
          currency: input.currency,
        }),
      )
      .filter((row): row is TransferOffer => Boolean(row))
      .sort((a, b) => a.costAmountMinor - b.costAmountMinor);
  }

  async searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]> {
    this.ensureConfigured();
    const city = String(params.city || "").trim();
    const fromKind = params.fromKind || "IATA";
    const toKind = params.toKind || "GPS";
    const resolvedFrom = await resolveTransferEndpoint({
      query: params.from,
      kind: fromKind,
      city,
    });
    const resolvedTo = await resolveTransferEndpoint({
      query: params.to,
      kind: toKind,
      city,
    });
    const { from, to } = await ensureDistinctTransferEndpoints(
      resolvedFrom,
      resolvedTo,
    );
    const adults = Math.max(1, params.adults || 1);
    const children = Math.max(0, params.children || 0);
    const infants = Math.max(0, params.infants || 0);
    const outboundAt = datetimeStamp(
      params.outboundDate,
      params.outboundTime || "10:00",
    );
    const inboundAt = params.inboundDate
      ? datetimeStamp(params.inboundDate, params.inboundTime || "18:00")
      : undefined;

    const fetchOnce = (
      origin: TransferEndpoint,
      dest: TransferEndpoint,
      returnAt?: string,
    ) =>
      this.fetchAvailability({
        from: origin,
        to: dest,
        outboundAt,
        inboundAt: returnAt,
        adults,
        children,
        infants,
        city,
        currency: params.currency,
      });

    let offers = await fetchOnce(from, to, inboundAt);
    if (!offers.length && inboundAt) {
      offers = await fetchOnce(from, to, undefined);
    }
    if (!offers.length && to.type === "ATLAS") {
      const gpsQuery = String(params.toLabel || city || "").trim();
      if (gpsQuery) {
        const gps = await resolveTransferEndpoint({
          query: gpsQuery,
          kind: "GPS",
          city,
        });
        if (!sameTransferPoint(from, gps)) {
          offers = await fetchOnce(from, gps, undefined);
        }
      }
    }
    return offers;
  }

  async createBooking(
    _offer: TransferOffer,
    _guests?: unknown,
  ): Promise<ProviderBookingResult> {
    throw new Error(
      "حجز مواصلات Hotelbeds الحي غير مفعّل بعد — البحث يعمل عبر Sandbox",
    );
  }
}
