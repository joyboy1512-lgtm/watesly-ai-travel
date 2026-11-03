export const WHATSAPP_HOTEL_PICK_ROWS = 10;

export type HotelPick = {
  id: string;
  name: string;
  stars?: number;
  priceFrom?: number;
  currency?: string;
  distanceToCenterLabel?: string;
};

type CatalogHotel = {
  id?: string;
  name?: string;
  stars?: number;
  priceFrom?: number;
  currency?: string;
  distanceToCenterLabel?: string;
};

/** Hotels the customer can tap: the rows just shown, capped at WhatsApp's 10. */
export function visibleHotelPicks(input: {
  hotels?: CatalogHotel[];
  offset?: number;
  shownCount?: number;
}): { picks: HotelPick[]; truncated: boolean } {
  const offset = Math.max(0, input.offset || 0);
  const rows: HotelPick[] = [];
  for (const hotel of input.hotels || []) {
    const id = String(hotel.id || "").trim();
    const name = String(hotel.name || "").trim();
    if (!id || !name) continue;
    rows.push({
      id,
      name,
      stars: hotel.stars,
      priceFrom: hotel.priceFrom,
      currency: hotel.currency,
      distanceToCenterLabel: hotel.distanceToCenterLabel,
    });
  }
  const fromOffset = rows.slice(offset);
  const shown =
    input.shownCount == null
      ? fromOffset.length
      : Math.max(0, Math.floor(input.shownCount));
  const slice = fromOffset.slice(0, shown);
  return {
    picks: slice.slice(0, WHATSAPP_HOTEL_PICK_ROWS),
    truncated: slice.length > WHATSAPP_HOTEL_PICK_ROWS,
  };
}

export function hotelPickDescription(pick: HotelPick): string {
  const parts: string[] = [];
  if (pick.distanceToCenterLabel) parts.push(pick.distanceToCenterLabel);
  if (pick.priceFrom != null && Number.isFinite(pick.priceFrom)) {
    const price = Number.isInteger(pick.priceFrom)
      ? String(pick.priceFrom)
      : pick.priceFrom.toFixed(2);
    parts.push(`من ${price}${pick.currency ? ` ${pick.currency}` : ""}`);
  }
  if (pick.stars) parts.push(`${pick.stars}★`);
  return parts.join(" · ");
}

/** Text the assistant sees after a tap, using the full catalog name. */
export function hotelPickCustomerText(input: {
  text: string;
  hotelPickId?: string;
  hotels?: Array<{ id?: string; name?: string }>;
}): string {
  const id = String(input.hotelPickId || "").trim();
  if (!id) return input.text;
  const hotel = (input.hotels || []).find((row) => row.id === id);
  const name = hotel?.name?.trim() || input.text.trim() || id;
  return `اخترت الفندق: ${name}\nhotelId: ${id}`;
}
