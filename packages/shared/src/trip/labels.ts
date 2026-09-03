import type { TripServiceKind } from "./types";

/** نص زر البحث الرئيسي حسب الخدمات المختارة */
export function tripSearchButtonLabel(services: TripServiceKind[]): string {
  const set = new Set(services);
  const count = set.size;
  if (count === 0) return "اختر خدمة واحدة على الأقل";
  if (count === 4) return "نظّم رحلتي كاملة";

  const only = (k: TripServiceKind) => count === 1 && set.has(k);
  if (only("flight")) return "ابحث عن الرحلات";
  if (only("hotel")) return "ابحث عن الفنادق";
  if (only("transfer")) return "ابحث عن المواصلات";
  if (only("activity")) return "ابحث عن الأنشطة";

  if (set.has("flight") && set.has("hotel") && count === 2) {
    return "ابحث عن باقة طيران وفندق";
  }
  return "ابحث عن الخدمات المختارة";
}

export const TRIP_SERVICE_META: Record<
  TripServiceKind,
  { labelAr: string; descriptionAr: string; icon: string }
> = {
  flight: {
    labelAr: "طيران",
    descriptionAr: "رحلات ذهاب وعودة",
    icon: "✈",
  },
  hotel: {
    labelAr: "فنادق",
    descriptionAr: "إقامة مريحة",
    icon: "🏨",
  },
  transfer: {
    labelAr: "مواصلات",
    descriptionAr: "نقل المطار والمدينة",
    icon: "🚐",
  },
  activity: {
    labelAr: "أنشطة",
    descriptionAr: "تجارب ومغامرات",
    icon: "🎯",
  },
};

export const TIER_LABELS: Record<string, string> = {
  budget: "الأقل سعرًا",
  balanced: "الخيار المتوازن",
  comfort: "الأكثر راحة",
};
