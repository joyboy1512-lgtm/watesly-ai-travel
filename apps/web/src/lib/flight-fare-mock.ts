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
};

export type RevalidateFailure = {
  ok: false;
  reason: "unavailable" | "error";
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
    label: "Economy Saver",
    labelAr: "اقتصادية موفّرة",
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
    label: "Economy Standard",
    labelAr: "اقتصادية قياسية",
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
    label: "Economy Flex",
    labelAr: "اقتصادية مرنة",
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

const MOCK_PROVIDERS = [
  { key: "weekendgate", name: "WeekendGate Direct" },
  { key: "skyhub", name: "SkyHub Travel" },
  { key: "gulfconnect", name: "Gulf Connect" },
];

function tierPrice(baseMinor: number, multiplier: number) {
  return Math.round(baseMinor * multiplier);
}

export function buildFareOptions(trip: ComposedTrip, passengers: number): MockFareOption[] {
  const base = trip.totalPriceMinor;
  const pax = Math.max(1, passengers);
  return TIER_DEFS.map((def) => {
    const total = tierPrice(base, def.multiplier);
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
  });
}

export function buildProviderOffers(
  trip: ComposedTrip,
  fare: MockFareOption,
): MockProviderOffer[] {
  return MOCK_PROVIDERS.map((p, i) => ({
    id: `${fare.id}-${p.key}`,
    providerKey: p.key,
    providerName: p.name,
    totalPriceMinor: Math.round(fare.totalPriceMinor * (1 + i * 0.015)),
    currency: trip.currency,
    fareOptionId: fare.id,
  })).sort((a, b) => a.totalPriceMinor - b.totalPriceMinor);
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

/** Simulated price revalidation — swap with real provider SDK call. */
export async function revalidateMockOffer(
  trip: ComposedTrip,
  fareId: string,
  providerId: string,
  passengers: number,
): Promise<RevalidateResult> {
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));

  if (Math.random() < 0.02) {
    return {
      ok: false,
      reason: "error",
      message: "تعذّر التحقق من السعر. تحقق من الاتصال وحاول مرة أخرى.",
    };
  }

  const fares = buildFareOptions(trip, passengers);
  const fare = fares.find((f) => f.id === fareId);
  if (!fare) {
    return {
      ok: false,
      reason: "unavailable",
      message: "السعر لم يعد متاحًا. يرجى تحديث النتائج.",
    };
  }

  const providers = buildProviderOffers(trip, fare);
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) {
    return {
      ok: false,
      reason: "unavailable",
      message: "عرض المزوّد لم يعد متاحًا.",
    };
  }

  return {
    ok: true,
    fare,
    provider,
    breakdown: computePriceBreakdown(provider.totalPriceMinor, trip.currency),
    validatedAt: new Date().toISOString(),
  };
}
