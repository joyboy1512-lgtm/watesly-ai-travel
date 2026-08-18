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

export interface PricedOffer<T extends FlightOffer | HotelOffer = FlightOffer | HotelOffer> {
  offer: T;
  serviceType: "flight" | "hotel";
  pricing: InternalPriceBreakdown;
  customerVisible: ReturnType<typeof toCustomerVisible>;
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

export async function searchAndPriceFlights(input: {
  params: FlightSearchParams;
  rules: PricingRuleInput[];
  providerKey?: string;
  provider?: FlightProviderAdapter | TravelProviderAdapter;
}): Promise<PricedOffer<FlightOffer>[]> {
  const provider =
    input.provider ?? getFlightProvider(input.providerKey);
  const offers = await provider.searchFlights(input.params);
  return priceOffers(offers, "flight", input.rules, {
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
}): Promise<PricedOffer<HotelOffer>[]> {
  const provider =
    input.provider ?? getHotelProvider(input.providerKey);
  if (!provider.searchHotels) {
    throw new Error(`المزود لا يدعم البحث عن الفنادق`);
  }
  const offers = await provider.searchHotels(input.params);
  return priceOffers(offers, "hotel", input.rules, {
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
  hotelProvider?: HotelProviderAdapter;
  rules: PricingRuleInput[];
  searchFlights?: boolean;
  searchHotels?: boolean;
  flightParams?: FlightSearchParams;
  hotelParams?: HotelSearchParams;
}) {
  const flightKey =
    input.flightProviderKey ??
    (input.providerKey ? resolveFlightProviderKey(input.providerKey) : undefined);
  const hotelKey =
    input.hotelProviderKey ??
    (input.providerKey ? resolveHotelProviderKey(input.providerKey) : undefined);

  const flightProvider = input.flightProvider ?? getFlightProvider(flightKey);
  const hotelProvider = input.hotelProvider ?? getHotelProvider(hotelKey);

  const wantFlights = input.searchFlights !== false && Boolean(input.flightParams);
  const wantHotels = Boolean(input.searchHotels && input.hotelParams);

  let hotelError: string | null = null;
  const flights =
    wantFlights && input.flightParams
      ? await searchAndPriceFlights({
          provider: flightProvider,
          params: input.flightParams,
          rules: input.rules,
        })
      : [];

  let hotels: PricedOffer<HotelOffer>[] = [];
  if (wantHotels && input.hotelParams) {
    try {
      hotels = await searchAndPriceHotels({
        provider: hotelProvider,
        params: input.hotelParams,
        rules: input.rules,
      });
    } catch (err) {
      hotelError = err instanceof Error ? err.message : "فشل بحث الفنادق";
    }
  }

  const sameKey = flightProvider.providerKey === hotelProvider.providerKey;
  return {
    flightProviderKey: flightProvider.providerKey,
    flightProviderName: flightProvider.displayName,
    flightLiveMode: flightProvider.liveMode,
    hotelProviderKey: hotelProvider.providerKey,
    hotelProviderName: hotelProvider.displayName,
    hotelLiveMode: hotelProvider.liveMode,
    // Legacy combined fields (UI/API that still read a single provider)
    providerKey: sameKey
      ? flightProvider.providerKey
      : `${flightProvider.providerKey}+${hotelProvider.providerKey}`,
    providerName: sameKey
      ? flightProvider.displayName
      : `طيران: ${flightProvider.displayName} · فنادق: ${hotelProvider.displayName}`,
    liveMode: flightProvider.liveMode || hotelProvider.liveMode,
    flights,
    hotels,
    hotelError,
  };
}

export async function revalidatePricedOffer(input: {
  offer: FlightOffer | HotelOffer;
  serviceType?: "flight" | "hotel";
  rules: PricingRuleInput[];
  providerKey?: string;
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

  const revalidateStars = (result.offer as { raw?: Record<string, unknown> }).raw?.stars;
  const rule = selectPricingRule(input.rules, serviceType, {
    provider: result.offer.providerKey,
    costAmountMinor: result.offer.costAmountMinor,
    stars:
      typeof revalidateStars === "number" || typeof revalidateStars === "string"
        ? revalidateStars
        : undefined,
  });
  const pricing = applyPricingRule({
    costAmountMinor: result.offer.costAmountMinor,
    currency: result.offer.currency,
    serviceType,
    rule,
  });
  return {
    ...result,
    pricing,
    customerVisible: toCustomerVisible({
      sellAmountMinor: pricing.sellAmountMinor,
      currency: pricing.currency,
      summary: result.offer.description,
      expiresAt: result.offer.expiresAt,
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
