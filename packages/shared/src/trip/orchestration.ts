import type {
  TripDraftState,
  TripPackageOption,
  TripSearchResult,
  TripServiceKind,
  TripTier,
} from "./types";

function tierOffset(tier: TripTier): number {
  if (tier === "budget") return 0;
  if (tier === "balanced") return 0.08;
  return 0.18;
}

/** يبني 3 خيارات من نتائج البحث الحقيقية/التجريبية */
export function buildPackageOptions(
  draft: TripDraftState,
  baseOffers: Partial<Record<TripServiceKind, { offers: { id: string; label: string; sellAmountMinor: number; currency: string }[] }>>,
): TripPackageOption[] {
  const tiers: TripTier[] = ["budget", "balanced", "comfort"];
  const titles = {
    budget: "الأقل سعرًا",
    balanced: "الخيار المتوازن",
    comfort: "الأكثر راحة",
  };

  return tiers.map((tier, tierIndex) => {
    let total = 0;
    const currency = "KWD";
    const option: TripPackageOption = {
      tier,
      titleAr: titles[tier],
      activities: [],
      totalMinor: 0,
      currency,
    };

    for (const kind of draft.services) {
      const slice = baseOffers[kind];
      const list = slice?.offers || [];
      if (!list.length) continue;
      const pick = list[Math.min(tierIndex, list.length - 1)];
      if (!pick) continue;
      const amount = Math.round(pick.sellAmountMinor * (1 + tierOffset(tier)));
      const offer = { ...pick, sellAmountMinor: amount, currency };
      if (kind === "activity") option.activities.push(offer);
      else if (kind === "flight") option.flight = offer;
      else if (kind === "hotel") option.hotel = offer;
      else if (kind === "transfer") option.transfer = offer;
      total += amount;
    }

    option.totalMinor = total;
    return option;
  });
}

export function mergeSearchSlices(
  sessionId: string,
  slices: TripSearchResult["slices"],
): TripSearchResult {
  const failed = slices.filter((s) => s.status === "error" || s.status === "timeout");
  const empty = slices.filter((s) => s.status === "empty");
  let status: TripSearchResult["status"] = "done";
  if (slices.every((s) => s.status === "ok")) status = "done";
  else if (failed.length && slices.some((s) => s.status === "ok")) status = "partial";
  else if (failed.length) status = "error";
  else if (empty.length === slices.length) status = "error";

  return {
    sessionId,
    status,
    slices,
    options: [],
    searchedAt: new Date().toISOString(),
  };
}
