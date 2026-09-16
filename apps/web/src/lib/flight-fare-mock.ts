import type { ComposedTrip } from "./flight-compose";

/** Replace this module with real Flight API fare/provider adapters. */
export const MOCK_SERVICE_FEE_RATE = 0.025;

export type FareTierKey = "economy_saver" | "economy_standard" | "economy_flex";

export type MockFareOption = {
  id: string;
  tierKey: FareTierKey;
  label: string;
  labelAr: string;
  totalPriceMinor: number;
  perPassengerMinor: number;
  cabinBag: string;
  checkedBag: string;
  refundable: boolean;
  refundableLabel: string;
  changeFee: string;
  cancelFee: string;
  seatSelection: string;
  meals: string;
};

export type MockProviderOffer = {
  id: string;
  providerKey: string;
  providerName: string;
  totalPriceMinor: number;
  currency: string;
  fareOptionId: string;
};

export type FlightPriceBreakdown = {
  baseMinor: number;
  taxesMinor: number;
  serviceFeeMinor: number;
  totalMinor: number;
  currency: string;
};

export type RevalidateSuccess = {
  ok: true;
  fare: MockFareOption;
  provider: MockProviderOffer;
  breakdown: FlightPriceBreakdown;
  validatedAt: string;
  priceChanged?: boolean;
  previousTotalMinor?: number;
};

export type RevalidateFailure = {
  ok: false;
  reason: "unavailable" | "expired" | "error";
  message: string;
};

export type RevalidateResult = RevalidateSuccess | RevalidateFailure;

const TIER_DEFS: Array<{
  tierKey: FareTierKey;
  label: string;
  labelAr: string;
  multiplier: number;
  cabinBag: string;
  checkedBag: string;
  refundable: boolean;
  refundableLabel: string;
  changeFee: string;
  cancelFee: string;
  seatSelection: string;
  meals: string;
}> = [
  {
    tierKey: "economy_saver",
    label: "Saver",
    labelAr: "Saver · موفّرة",
    multiplier: 1,
    cabinBag: "7 كغ حقيبة مقصورة",
    checkedBag: "غير مشمولة",
    refundable: false,
    refundableLabel: "غير قابلة للاسترداد",
    changeFee: "50.000 د.ك + فرق السعر",
    cancelFee: "غير قابل للاسترداد",
    seatSelection: "برسوم",
    meals: "وجبة خفيفة",
  },
  {
    tierKey: "economy_standard",
    label: "Standard",
    labelAr: "Standard · قياسية",
    multiplier: 1.12,
    cabinBag: "7 كغ حقيبة مقصورة",
    checkedBag: "23 كغ حقيبة مسجّلة",
    refundable: false,
    refundableLabel: "استرداد جزئي",
    changeFee: "25.000 د.ك + فرق السعر",
    cancelFee: "75% من قيمة التذكرة",
    seatSelection: "مجاني (مقاعد محددة)",
    meals: "وجبة مشمولة",
  },
  {
    tierKey: "economy_flex",
    label: "Flex",
    labelAr: "Flex · مرنة",
    multiplier: 1.28,
    cabinBag: "10 كغ حقيبة مقصورة",
    checkedBag: "30 كغ حقيبة مسجّلة",
    refundable: true,
    refundableLabel: "قابلة للاسترداد",
    changeFee: "مجاني (فرق السعر فقط)",
    cancelFee: "استرداد كامل قبل 24 ساعة",
    seatSelection: "مجاني",
    meals: "وجبة + مشروبات",
  },
];

/** Shop shows one WeekendGate sell price. Aggregation already picked cheapest/preferred. */
const SHOP_PROVIDER = { key: "weekendgate", name: "WeekendGate" };

function tierPrice(baseMinor: number, multiplier: number) {
  return Math.round(baseMinor * multiplier);
}

function fareFromTier(
  trip: ComposedTrip,
  passengers: number,
  def: (typeof TIER_DEFS)[number],
): MockFareOption {
  const total = tierPrice(trip.totalPriceMinor, def.multiplier);
  const pax = Math.max(1, passengers);
  return {
    id: `${trip.id}-${def.tierKey}`,
    tierKey: def.tierKey,
    label: def.label,
    labelAr: def.labelAr,
    totalPriceMinor: total,
    perPassengerMinor: Math.round(total / pax),
    cabinBag: def.cabinBag,
    checkedBag: def.checkedBag,
    refundable: def.refundable,
    refundableLabel: def.refundableLabel,
    changeFee: def.changeFee,
    cancelFee: def.cancelFee,
    seatSelection: def.seatSelection,
    meals: def.meals,
  };
}

/** @deprecated Fare families are not shown in shop; kept for draft typing. */
export function buildFareOptions(trip: ComposedTrip, passengers: number): MockFareOption[] {
  return TIER_DEFS.map((def) => fareFromTier(trip, passengers, def));
}

/** Single shop fare: the aggregated WeekendGate sell price (no Saver/Flex markup). */
export function unifiedShopFare(trip: ComposedTrip, passengers: number): MockFareOption {
  const bag = trip.outbound.baggage;
  const pax = Math.max(1, passengers);
  return {
    id: `${trip.id}-shop`,
    tierKey: "economy_saver",
    label: "WeekendGate",
    labelAr: "سعر WeekendGate",
    totalPriceMinor: trip.totalPriceMinor,
    perPassengerMinor: Math.round(trip.totalPriceMinor / pax),
    cabinBag: bag.cabin || bag.personal || "حقيبة مقصورة حسب الفئة",
    checkedBag: bag.checked || "الأمتعة المسجّلة حسب الفئة",
    refundable: false,
    refundableLabel: "حسب سياسة التذكرة",
    changeFee: "حسب سياسة التذكرة",
    cancelFee: "حسب سياسة التذكرة",
    seatSelection: "حسب سياسة التذكرة",
    meals: "حسب سياسة التذكرة",
  };
}

export function unifiedShopProvider(
  trip: ComposedTrip,
  fare: MockFareOption,
): MockProviderOffer {
  return {
    id: `${fare.id}-${SHOP_PROVIDER.key}`,
    providerKey: SHOP_PROVIDER.key,
    providerName: SHOP_PROVIDER.name,
    totalPriceMinor: trip.totalPriceMinor,
    currency: trip.currency,
    fareOptionId: fare.id,
  };
}

/** Shop never lists competing supplier prices — aggregation already chose one. */
export function buildProviderOffers(
  trip: ComposedTrip,
  fare: MockFareOption,
): MockProviderOffer[] {
  return [unifiedShopProvider(trip, fare)];
}

export function computePriceBreakdown(
  totalMinor: number,
  currency: string,
): FlightPriceBreakdown {
  const serviceFeeMinor = Math.round(totalMinor * MOCK_SERVICE_FEE_RATE);
  const subtotal = totalMinor - serviceFeeMinor;
  const taxesMinor = Math.round(subtotal * 0.18);
  const baseMinor = subtotal - taxesMinor;
  return {
    baseMinor: Math.max(0, baseMinor),
    taxesMinor,
    serviceFeeMinor,
    totalMinor: baseMinor + taxesMinor + serviceFeeMinor,
    currency,
  };
}

/** Simulated revalidation of the single aggregated shop price. */
export async function revalidateShopOffer(
  trip: ComposedTrip,
  passengers: number,
): Promise<RevalidateResult> {
  const fare = unifiedShopFare(trip, passengers);
  const provider = unifiedShopProvider(trip, fare);
  return revalidateMockOffer(trip, fare.id, provider.id, passengers);
}

export async function revalidateMockOffer(
  trip: ComposedTrip,
  fareId: string,
  providerId: string,
  passengers: number,
): Promise<RevalidateResult> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));

  const roll = Math.random();
  if (roll < 0.02) {
    return {
      ok: false,
      reason: "error",
      message: "تعذر الاتصال بالمزوّد. تحقق من الاتصال وحاول مرة أخرى.",
    };
  }
  if (roll < 0.035) {
    return {
      ok: false,
      reason: "expired",
      message: "انتهى العرض. حدّث النتائج واختر رحلة أخرى.",
    };
  }

  const fare = unifiedShopFare(trip, passengers);
  if (fareId && fareId !== fare.id && !fareId.startsWith(`${trip.id}-`)) {
    return {
      ok: false,
      reason: "unavailable",
      message: "لم يعد متاحًا. يرجى تحديث النتائج.",
    };
  }

  let provider = unifiedShopProvider(trip, fare);
  if (providerId && providerId !== provider.id && !providerId.startsWith(`${trip.id}-`)) {
    return {
      ok: false,
      reason: "unavailable",
      message: "لم يعد متاحًا لدى المزوّد.",
    };
  }

  const previousTotalMinor = provider.totalPriceMinor;
  let priceChanged = false;
  if (Math.random() < 0.08) {
    provider = {
      ...provider,
      totalPriceMinor: Math.round(provider.totalPriceMinor * 1.035),
    };
    priceChanged = true;
  }

  return {
    ok: true,
    fare,
    provider,
    breakdown: computePriceBreakdown(provider.totalPriceMinor, trip.currency),
    validatedAt: new Date().toISOString(),
    priceChanged,
    previousTotalMinor: priceChanged ? previousTotalMinor : undefined,
  };
}
