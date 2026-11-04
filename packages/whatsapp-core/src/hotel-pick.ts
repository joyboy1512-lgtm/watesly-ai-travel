/** Row id prefix for a tappable hotel list. The tap comes back as this id. */
export const HOTEL_PICK_ID_PREFIX = "hotel:";

export function hotelPickRowId(hotelId: string): string {
  return `${HOTEL_PICK_ID_PREFIX}${hotelId}`.slice(0, 200);
}

export function parseHotelPickRowId(id?: string): string | null {
  const raw = String(id || "").trim();
    if (!raw.startsWith(HOTEL_PICK_ID_PREFIX) || raw.startsWith("hotels:")) return null;
  const hotelId = raw.slice(HOTEL_PICK_ID_PREFIX.length).trim();
  if (!hotelId || hotelId.length > 180) return null;
  return hotelId;
}
