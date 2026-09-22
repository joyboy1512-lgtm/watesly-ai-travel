export type HotelSuggestItem = {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  kind?: string;
  badge?: string;
  meta?: string;
};

export function hotelSuggestBadge(name: string, kind?: string): string {
  const blob = `${name} ${kind || ""}`.toLowerCase();
  if (/apart|شقق|شقة|studio/.test(blob)) return "apartment";
  if (/villa|فيلا/.test(blob)) return "villa";
  if (kind === "hotel" || /hotel|فندق/.test(blob)) return "hotel";
  return kind === "city" || kind === "region" ? "region" : kind || "";
}

export function groupHotelSuggests(items: HotelSuggestItem[]) {
  const destinations: HotelSuggestItem[] = [];
  const hotels: HotelSuggestItem[] = [];
  for (const item of items) {
    if (item.kind === "hotel") hotels.push(item);
    else destinations.push(item);
  }
  return { destinations, hotels };
}
