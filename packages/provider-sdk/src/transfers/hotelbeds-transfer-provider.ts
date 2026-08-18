import type { TransferOffer } from "@watesly-travel/shared";
import { transferTypeLabelAr } from "@watesly-travel/shared";
import { geocodeLocation } from "../locations";
import type {
  ProviderBookingResult,
  TransferProviderAdapter,
  TransferSearchParams,
} from "../types";
import { amountToMinor } from "../types";
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

export type TransferEndpoint = { type: "IATA" | "GPS"; code: string; label: string };

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

export async function resolveTransferEndpoint(
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
  const geo = await geocodeLocation(raw);
  if (!geo) {
    throw new Error(
      `تعذر تحديد موقع «${raw}». استخدم رمز مطار مثل KWI أو DXB أو اسم مدينة معروفة.`,
    );
  }
  return {
    type: "GPS",
    code: `${geo.latitude.toFixed(5)},${geo.longitude.toFixed(5)}`,
    label: geo.label || raw,
  };
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function mapService(
  service: HbTransferService,
  input: {
    from: TransferEndpoint;
    to: TransferEndpoint;
    liveMode: boolean;
    outboundAt: string;
    inboundAt?: string;
  },
): TransferOffer | null {
  const rateKey = String(service.rateKey || "").trim();
  const amount = Number(service.price?.totalAmount ?? service.price?.netAmount ?? 0);
  if (!rateKey || !Number.isFinite(amount) || amount <= 0) return null;

  const currency = String(service.price?.currencyId || "EUR").toUpperCase();
  const transferType = String(service.transferType || "PRIVATE").toUpperCase();
  const vehicleName =
    textOf(service.vehicle?.name) || String(service.vehicle?.code || "مركبة");
  const categoryName = textOf(service.category?.name);
  const fromLabel =
    textOf(service.pickupInformation?.from?.description) || input.from.label;
  const toLabel =
    textOf(service.pickupInformation?.to?.description) || input.to.label;
  const cancel = service.cancellationPolicies?.[0];
  const cancelAmount = Number(cancel?.amount ?? 0);
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
    providerKey: "hotelbeds",
    providerOfferRef: rateKey,
    description,
    costAmountMinor: amountToMinor(amount, currency),
    currency,
    revalidationToken: JSON.stringify({ rateKey, transferType }),
    expiresAt: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    raw: {
      provider: "hotelbeds",
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
  readonly providerKey = "hotelbeds";
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

  async searchTransfers(params: TransferSearchParams): Promise<TransferOffer[]> {
    this.ensureConfigured();
    const from = await resolveTransferEndpoint(params.from);
    const to = await resolveTransferEndpoint(params.to);
    const adults = Math.max(1, params.adults || 1);
    const children = Math.max(0, params.children || 0);
    const infants = Math.max(0, params.infants || 0);
    const outboundAt = datetimeStamp(params.outboundDate, params.outboundTime || "10:00");
    const inboundAt =
      params.inboundDate
        ? datetimeStamp(params.inboundDate, params.inboundTime || "18:00")
        : undefined;

    const pathParts = [
      "/transfer-api/1.0/availability/en/from",
      from.type,
      encodeSegment(from.code),
      "to",
      to.type,
      encodeSegment(to.code),
      outboundAt,
    ];
    if (inboundAt) pathParts.push(inboundAt);
    pathParts.push(String(adults), String(children), String(infants));
    const path = pathParts.join("/");

    const url = `${this.creds.baseUrl}${path}`;
    const response = await fetch(url, { headers: hotelbedsHeaders(this.creds) });
    const json = (await response.json().catch(() => ({}))) as HbTransferAvailabilityResponse & {
      message?: string;
    };
    if (!response.ok) {
      throw new Error(
        json.error?.message || json.message || `Hotelbeds Transfers HTTP ${response.status}`,
      );
    }

    const offers = (json.services || [])
      .map((service) =>
        mapService(service, {
          from,
          to,
          liveMode: this.liveMode,
          outboundAt,
          inboundAt,
        }),
      )
      .filter((row): row is TransferOffer => Boolean(row));

    return offers.sort((a, b) => a.costAmountMinor - b.costAmountMinor);
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
