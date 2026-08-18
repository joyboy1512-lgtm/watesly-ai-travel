import type {
  FlightOffer,
  HotelOffer,
  HotelPropertyDetails,
  HotelRateOption,
  TransferOffer,
} from "@watesly-travel/shared";
import type { TransferServiceDetails } from "@watesly-travel/shared";

function intEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function toolResultLimits() {
  return {
    maxItems: intEnv("AI_TOOL_MAX_ITEMS", 10),
    maxRatesPerHotel: intEnv("AI_TOOL_MAX_RATES_PER_HOTEL", 12),
    maxJsonChars: intEnv("AI_TOOL_MAX_JSON_CHARS", 32000),
  };
}

function slicePolicies(rate: HotelRateOption) {
  return (rate.cancellationPolicies || []).slice(0, 2).map((p) => ({
    from: p.from,
    amount: p.amount,
    currency: p.currency,
  }));
}

function serializeHotel(row: HotelOffer, maxRates: number) {
  const raw = row.raw as HotelPropertyDetails | undefined;
  const rates = (raw?.rateOptions || []).slice(0, maxRates).map((rate) => ({
    roomName: rate.roomName,
    roomCode: rate.roomCode,
    boardCode: rate.boardCode,
    boardName: rate.boardName,
    net: rate.net,
    sellingRate: rate.sellingRate,
    currency: rate.currency,
    rateType: rate.rateType,
    paymentType: rate.paymentType,
    freeCancellation: rate.freeCancellation,
    allotment: rate.allotment,
    promotions: (rate.promotions || [])
      .slice(0, 2)
      .map((p) => p.name || p.remark)
      .filter(Boolean),
    cancellationPolicies: slicePolicies(rate),
    rateComments: rate.rateComments?.slice(0, 400),
  }));

  return {
    id: row.providerOfferRef,
    provider: row.providerKey,
    name: raw?.name,
    stars: raw?.stars,
    category: raw?.categoryName,
    location: raw?.location,
    zone: raw?.zoneName,
    address: raw?.address,
    checkInDate: raw?.checkInDate,
    checkOutDate: raw?.checkOutDate,
    nights: raw?.nights,
    currency: row.currency,
    minRate: raw?.minRate,
    maxRate: raw?.maxRate,
    cheapestAmountMinor: row.costAmountMinor,
    boards: raw?.boards,
    paymentTypes: raw?.paymentTypes,
    freeCancellation: raw?.freeCancellation,
    facilities: (raw?.facilityLabels || raw?.facilities || []).slice(0, 12),
    description: row.description,
    rateCountTotal: raw?.rateOptions?.length || rates.length,
    ratesShown: rates.length,
    rates,
    roomsSummary: (raw?.rooms || []).slice(0, 6).map((room) => ({
      code: room.code,
      name: room.name,
      rateCount: room.rates?.length || 0,
    })),
    expiresAt: row.expiresAt,
  };
}

function serializeFlight(row: FlightOffer) {
  const raw = row.raw as Record<string, unknown> | undefined;
  return {
    id: row.providerOfferRef,
    provider: row.providerKey,
    description: row.description,
    amountMinor: row.costAmountMinor,
    currency: row.currency,
    expiresAt: row.expiresAt,
    carrier: raw?.carrier,
    flightNumber: raw?.flightNumber,
    origin: raw?.origin,
    destination: raw?.destination,
    departAt: raw?.departAt,
    arriveAt: raw?.arriveAt,
    duration: raw?.duration,
    stops: raw?.stops,
    cabinClass: raw?.cabinClass,
  };
}

function serializeTransfer(row: TransferOffer) {
  const raw = row.raw as TransferServiceDetails | undefined;
  return {
    id: row.providerOfferRef,
    provider: row.providerKey,
    description: row.description,
    amountMinor: row.costAmountMinor,
    currency: row.currency,
    transferType: raw?.transferTypeLabel || raw?.transferType,
    vehicle: raw?.vehicleName,
    category: raw?.categoryName,
    from: raw?.fromLabel,
    to: raw?.toLabel,
    outboundAt: raw?.outboundAt,
    inboundAt: raw?.inboundAt,
    minPax: raw?.minPax,
    maxPax: raw?.maxPax,
    freeCancellation: raw?.freeCancellation,
    cancellationFrom: raw?.cancellationFrom,
    cancellationAmount: raw?.cancellationAmount,
    expiresAt: row.expiresAt,
  };
}

function boundedJson(payload: unknown, maxChars: number): string {
  let text = JSON.stringify(payload);
  if (text.length <= maxChars) return text;

  const clone = structuredClone(payload) as {
    items?: unknown[];
    truncated?: Record<string, unknown>;
  };
  if (Array.isArray(clone.items)) {
    while (clone.items.length > 1 && text.length > maxChars) {
      clone.items.pop();
      clone.truncated = {
        ...(clone.truncated || {}),
        reason: "payload_too_large",
        maxJsonChars: maxChars,
      };
      text = JSON.stringify(clone);
    }
  }
  if (text.length > maxChars) {
    return JSON.stringify({
      error: "نتائج البحث أكبر من الحد المسموح للـ AI",
      hint: "قلّل limit أو اطلب فندقاً/عرضاً محدداً",
      maxJsonChars: maxChars,
      previewChars: maxChars,
    });
  }
  return text;
}

export function serializeSearchResult(input: {
  provider: string;
  liveMode: boolean;
  rows: Array<FlightOffer | HotelOffer | TransferOffer>;
  kind: "flight" | "hotel" | "transfer";
  offset?: number;
  limit?: number;
}): string {
  const limits = toolResultLimits();
  const offset = Math.max(0, input.offset || 0);
  const limit = Math.min(
    20,
    Math.max(1, input.limit || limits.maxItems),
  );
  const slice = input.rows.slice(offset, offset + limit);

  const items =
    input.kind === "hotel"
      ? slice.map((row) =>
          serializeHotel(row as HotelOffer, limits.maxRatesPerHotel),
        )
      : input.kind === "transfer"
        ? slice.map((row) => serializeTransfer(row as TransferOffer))
        : slice.map((row) => serializeFlight(row as FlightOffer));

  return boundedJson(
    {
      liveMode: input.liveMode,
      provider: input.provider,
      countTotal: input.rows.length,
      offset,
      countReturned: items.length,
      hasMore: offset + items.length < input.rows.length,
      nextOffset:
        offset + items.length < input.rows.length
          ? offset + items.length
          : undefined,
      items,
    },
    limits.maxJsonChars,
  );
}
