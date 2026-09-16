import {
  applyPricingRule,
  selectPricingRule,
  toCustomerVisible,
  type PricingRuleInput,
} from "@watesly-travel/pricing-engine";
import {
  getFlightProvider,
  getHotelProvider,
  getTravelProvider,
  isHotelOffer,
  resolveFlightProviderKey,
  resolveHotelProviderKey,
  resolveProviderKey,
  type FlightProviderAdapter,
  type FlightSearchParams,
  type HotelProviderAdapter,
  type HotelSearchParams,
  type TravelProviderAdapter,
} from "@watesly-travel/provider-sdk";
import type {
  FlightOffer,
  HotelOffer,
  InternalPriceBreakdown,
} from "@watesly-travel/shared";
import {
  buildFxLookup,
  convertMinorAmount,
  type FxRateLookup,
  type FxRatePair,
} from "@watesly-travel/shared";

export interface PricedOffer<T extends FlightOffer | HotelOffer = FlightOffer | HotelOffer> {
  offer: T;
  serviceType: "flight" | "hotel";
  pricing: InternalPriceBreakdown;
  customerVisible: ReturnType<typeof toCustomerVisible>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function segmentFingerprint(seg: Record<string, unknown>): string {
  const marketing =
    asRecord(seg.marketing_carrier)?.iata_code ||
    asRecord(seg.marketingCarrier)?.iata_code ||
    seg.carrier ||
    seg.airlineCode ||
    "";
  const number =
    seg.marketing_carrier_flight_number ||
    seg.marketingCarrierFlightNumber ||
    seg.flightNumber ||
    seg.number ||
    "";
  const dep =
    asRecord(seg.departing_at)?.toString?.() ||
    seg.departing_at ||
    seg.departAt ||
    seg.departure ||
    asRecord(seg.departure)?.at ||
    "";
  const origin =
    asRecord(seg.origin)?.iata_code ||
    seg.origin ||
    seg.from ||
    "";
  const destination =
    asRecord(seg.destination)?.iata_code ||
    seg.destination ||
    seg.to ||
    "";
  return [
    String(marketing).toUpperCase(),
    String(number).replace(/\s+/g, "").toUpperCase(),
    String(dep).slice(0, 16),
    String(origin).toUpperCase(),
    String(destination).toUpperCase(),
  ].join("|");
}

/** Same date + same marketed flights → one itinerary fingerprint for cheapest-wins. */
export function flightItineraryFingerprint(offer: FlightOffer): string {
  const raw = asRecord(offer.raw) || {};
  const nestedOffer = asRecord(raw.offer) || raw;

  const duffelSlices = Array.isArray(nestedOffer.slices)
    ? (nestedOffer.slices as unknown[])
    : [];
  if (duffelSlices.length) {
    const parts: string[] = [];
    for (const slice of duffelSlices) {
      const segments = asRecord(slice)?.segments;
      if (!Array.isArray(segments)) continue;
      for (const seg of segments) {
        const rec = asRecord(seg);
        if (rec) parts.push(segmentFingerprint(rec));
      }
    }
    if (parts.length) return `itin:${parts.join(">")}`;
  }

  const segments = Array.isArray(raw.segments)
    ? (raw.segments as unknown[])
    : Array.isArray(nestedOffer.segments)
      ? (nestedOffer.segments as unknown[])
      : [];
  if (segments.length) {
    const parts = segments
      .map((seg) => asRecord(seg))
      .filter(Boolean)
      .map((seg) => segmentFingerprint(seg as Record<string, unknown>));
    if (parts.length) return `itin:${parts.join(">")}`;
  }

  // Fallback: description + route tokens — still allows cross-provider cheapest when raw is thin.
  return `desc:${offer.description.trim().toUpperCase()}`;
}

export function convertOfferToCurrency<T extends FlightOffer | HotelOffer>(
  offer: T,
  displayCurrency: string,
  lookup?: FxRateLookup | null,
): T {
  const to = displayCurrency.trim().toUpperCase();
  const from = String(offer.currency || "").toUpperCase();
  if (!to || !from || from === to) return offer;
  const converted = convertMinorAmount(
    offer.costAmountMinor,
    from,
    to,
    lookup,
  );
  return {
    ...offer,
    costAmountMinor: converted,
    currency: to as T["currency"],
    raw: {
      ...(typeof offer.raw === "object" && offer.raw ? offer.raw : {}),
      fx: {
        fromCurrency: from,
        toCurrency: to,
        originalCostMinor: offer.costAmountMinor,
      },
    },
  };
}

function priceOffers<T extends FlightOffer | HotelOffer>(
  offers: T[],
  serviceType: "flight" | "hotel",
  rules: PricingRuleInput[],
  context?: {
    origin?: string;
    destination?: string;
    cabinClass?: string;
    stars?: number | string;
    departDate?: string;
    checkIn?: string;
    city?: string;
  },
): PricedOffer<T>[] {
  return offers.map((offer) => {
    const rawStars = (offer as { raw?: Record<string, unknown> }).raw?.stars;
    const stars =
      typeof rawStars === "number" || typeof rawStars === "string"
        ? rawStars
        : context?.stars;
    const rule = selectPricingRule(rules, serviceType, {
      ...context,
      stars,
      provider: offer.providerKey,
      costAmountMinor: offer.costAmountMinor,
    });
    const pricing = applyPricingRule({
      costAmountMinor: offer.costAmountMinor,
      currency: offer.currency,
      serviceType,
      rule,
    });
    return {
      offer,
      serviceType,
      pricing,
      customerVisible: toCustomerVisible({
        sellAmountMinor: pricing.sellAmountMinor,
        currency: pricing.currency,
        summary: offer.description,
        expiresAt: offer.expiresAt,
      }),
    };
  });
}

/** Keep the cheapest priced offer per itinerary fingerprint. */
export function dedupeFlightsByCheapest(
  rows: PricedOffer<FlightOffer>[],
): PricedOffer<FlightOffer>[] {
  const best = new Map<string, PricedOffer<FlightOffer>>();
  for (const row of rows) {
    const key = flightItineraryFingerprint(row.offer);
    const prev = best.get(key);
    if (!prev || row.pricing.sellAmountMinor < prev.pricing.sellAmountMinor) {
      best.set(key, row);
    }
  }
  return [...best.values()].sort(
    (a, b) => a.pricing.sellAmountMinor - b.pricing.sellAmountMinor,
  );
}

export async function searchAndPriceFlights(input: {
  params: FlightSearchParams;
  rules: PricingRuleInput[];
  providerKey?: string;
  provider?: FlightProviderAdapter | TravelProviderAdapter;
  displayCurrency?: string;
  fxRates?: FxRatePair[];
}): Promise<PricedOffer<FlightOffer>[]> {
  const provider =
    input.provider ?? getFlightProvider(input.providerKey);
  const offers = await provider.searchFlights(input.params);
  const lookup = input.fxRates?.length
    ? buildFxLookup(input.fxRates)
    : undefined;
  const display =
    input.displayCurrency?.trim().toUpperCase() ||
    input.params.currency?.trim().toUpperCase() ||
    "";
  const normalized = display
    ? offers.map((o) => convertOfferToCurrency(o, display, lookup))
    : offers;
  return priceOffers(normalized, "flight", input.rules, {
    origin: input.params.origin,
    destination: input.params.destination,
    cabinClass: input.params.cabinClass ?? undefined,
    departDate: input.params.departDate,
  });
}

export async function searchAndPriceHotels(input: {
  params: HotelSearchParams;
  rules: PricingRuleInput[];
  providerKey?: string;
  provider?: HotelProviderAdapter | TravelProviderAdapter;
  displayCurrency?: string;
  fxRates?: FxRatePair[];
}): Promise<PricedOffer<HotelOffer>[]> {
  const provider =
    input.provider ?? getHotelProvider(input.providerKey);
  if (!provider.searchHotels) {
    throw new Error(`المزود لا يدعم البحث عن الفنادق`);
  }
  const offers = await provider.searchHotels(input.params);
  const lookup = input.fxRates?.length
    ? buildFxLookup(input.fxRates)
    : undefined;
  const display =
    input.displayCurrency?.trim().toUpperCase() ||
    input.params.currency?.trim().toUpperCase() ||
    "";
  const normalized = display
    ? offers.map((o) => convertOfferToCurrency(o, display, lookup))
    : offers;
  return priceOffers(normalized, "hotel", input.rules, {
    city: input.params.location,
    destination: input.params.location,
    checkIn: input.params.checkInDate,
  });
}

export async function searchAndPriceTravel(input: {
  /** @deprecated Prefer flightProviderKey / hotelProviderKey */
  providerKey?: string;
  flightProviderKey?: string;
  hotelProviderKey?: string;
  flightProvider?: FlightProviderAdapter;
  /** Fan-out: search every enabled flight engine and keep cheapest per itinerary */
  flightProviders?: FlightProviderAdapter[];
  hotelProvider?: HotelProviderAdapter;
  rules: PricingRuleInput[];
  searchFlights?: boolean;
  searchHotels?: boolean;
  flightParams?: FlightSearchParams;
  hotelParams?: HotelSearchParams;
  displayCurrency?: string;
  fxRates?: FxRatePair[];
}) {
  const flightKey =
    input.flightProviderKey ??
    (input.providerKey ? resolveFlightProviderKey(input.providerKey) : undefined);
  const hotelKey =
    input.hotelProviderKey ??
    (input.providerKey ? resolveHotelProviderKey(input.providerKey) : undefined);

  const flightProviders =
    input.flightProviders?.length
      ? input.flightProviders
      : [input.flightProvider ?? getFlightProvider(flightKey)];
  const hotelProvider = input.hotelProvider ?? getHotelProvider(hotelKey);

  const wantFlights = input.searchFlights !== false && Boolean(input.flightParams);
  const wantHotels = Boolean(input.searchHotels && input.hotelParams);

  let hotelError: string | null = null;
  let flightErrors: string[] = [];

  let flights: PricedOffer<FlightOffer>[] = [];
  if (wantFlights && input.flightParams) {
    const settled = await Promise.allSettled(
      flightProviders.map((provider) =>
        searchAndPriceFlights({
          provider,
          params: input.flightParams!,
          rules: input.rules,
          displayCurrency: input.displayCurrency,
          fxRates: input.fxRates,
        }),
      ),
    );
    const merged: PricedOffer<FlightOffer>[] = [];
    for (let i = 0; i < settled.length; i += 1) {
      const result = settled[i]!;
      const provider = flightProviders[i]!;
      if (result.status === "fulfilled") {
        merged.push(...result.value);
      } else {
        const msg =
          result.reason instanceof Error
            ? result.reason.message
            : "فشل بحث الطيران";
        flightErrors.push(`${provider.displayName}: ${msg}`);
      }
    }
    flights = dedupeFlightsByCheapest(merged);
  }

  let hotels: PricedOffer<HotelOffer>[] = [];
  if (wantHotels && input.hotelParams) {
    try {
      hotels = await searchAndPriceHotels({
        provider: hotelProvider,
        params: input.hotelParams,
        rules: input.rules,
        displayCurrency: input.displayCurrency,
        fxRates: input.fxRates,
      });
    } catch (err) {
      hotelError = err instanceof Error ? err.message : "فشل بحث الفنادق";
    }
  }

  const primaryFlight = flightProviders[0]!;
  const multiFlight = flightProviders.length > 1;
  const flightProviderKey = multiFlight
    ? flightProviders.map((p) => p.providerKey).join("+")
    : primaryFlight.providerKey;
  const flightProviderName = multiFlight
    ? `مجمّع الأرخص (${flightProviders.map((p) => p.displayName).join(" · ")})`
    : primaryFlight.displayName;
  const flightLiveMode = flightProviders.some((p) => p.liveMode);

  const sameKey =
    !multiFlight && primaryFlight.providerKey === hotelProvider.providerKey;
  return {
    flightProviderKey,
    flightProviderName,
    flightLiveMode,
    hotelProviderKey: hotelProvider.providerKey,
    hotelProviderName: hotelProvider.displayName,
    hotelLiveMode: hotelProvider.liveMode,
    providerKey: sameKey
      ? primaryFlight.providerKey
      : `${flightProviderKey}+${hotelProvider.providerKey}`,
    providerName: sameKey
      ? primaryFlight.displayName
      : `طيران: ${flightProviderName} · فنادق: ${hotelProvider.displayName}`,
    liveMode: flightLiveMode || hotelProvider.liveMode,
    flights,
    hotels,
    hotelError,
    flightErrors: flightErrors.length ? flightErrors : undefined,
  };
}

export async function revalidatePricedOffer(input: {
  offer: FlightOffer | HotelOffer;
  serviceType?: "flight" | "hotel";
  rules: PricingRuleInput[];
  providerKey?: string;
  displayCurrency?: string;
  fxRates?: FxRatePair[];
}) {
  const serviceType =
    input.serviceType || (isHotelOffer(input.offer) ? "hotel" : "flight");

  const result =
    serviceType === "hotel"
      ? await getHotelProvider(
          input.providerKey || input.offer.providerKey,
        ).revalidateOffer(input.offer as HotelOffer)
      : await getFlightProvider(
          input.providerKey || input.offer.providerKey,
        ).revalidateOffer(input.offer as FlightOffer);

  const lookup = input.fxRates?.length
    ? buildFxLookup(input.fxRates)
    : undefined;
  const display = input.displayCurrency?.trim().toUpperCase() || "";
  const offer = display
    ? convertOfferToCurrency(result.offer, display, lookup)
    : result.offer;

  const revalidateStars = (offer as { raw?: Record<string, unknown> }).raw?.stars;
  const rule = selectPricingRule(input.rules, serviceType, {
    provider: offer.providerKey,
    costAmountMinor: offer.costAmountMinor,
    stars:
      typeof revalidateStars === "number" || typeof revalidateStars === "string"
        ? revalidateStars
        : undefined,
  });
  const pricing = applyPricingRule({
    costAmountMinor: offer.costAmountMinor,
    currency: offer.currency,
    serviceType,
    rule,
  });
  return {
    ...result,
    offer,
    pricing,
    customerVisible: toCustomerVisible({
      sellAmountMinor: pricing.sellAmountMinor,
      currency: pricing.currency,
      summary: offer.description,
      expiresAt: offer.expiresAt,
    }),
  };
}

export {
  getFlightProvider,
  getHotelProvider,
  getTravelProvider,
  resolveFlightProviderKey,
  resolveHotelProviderKey,
  resolveProviderKey,
};
export type {
  FlightSearchParams,
  HotelSearchParams,
  FlightProviderAdapter,
  HotelProviderAdapter,
  TravelProviderAdapter,
};
