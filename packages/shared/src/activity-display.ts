/** Rich activity display model — provider-agnostic UI shape. */

export type ActivityServiceDetails = {
  provider: string;
  liveMode: boolean;
  source?: string;
  sourceLabel?: string;
  fetchedAt?: string;
  activityCode?: string;
  activityName?: string;
  activityType?: string;
  activityTypeLabel?: string;
  destinationCode?: string;
  destinationName?: string;
  countryName?: string;
  summary?: string;
  durationLabel?: string;
  imageUrl?: string;
  adultFrom?: number;
  currency?: string;
  freeCancellation?: boolean;
  [key: string]: unknown;
};

export function activityTypeLabelAr(type?: string): string {
  const key = String(type || "").toUpperCase();
  if (key === "TICKET") return "تذكرة";
  if (key === "TOUR" || key === "EXCURSION") return "جولة";
  if (key === "TRANSFER") return "نقل";
  if (key === "PACKAGE") return "باقة";
  return type || "نشاط";
}
