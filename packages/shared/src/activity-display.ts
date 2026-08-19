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

export function stripActivityHtml(value?: string | null): string {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function activityTypeLabelAr(type?: string): string {
  const key = String(type || "").toUpperCase();
  if (key === "TICKET") return "تذكرة";
  if (key === "TOUR" || key === "EXCURSION") return "جولة";
  if (key === "TRANSFER") return "نقل";
  if (key === "PACKAGE") return "باقة";
  return type || "نشاط";
}
