export const WHATSAPP_HOTEL_PICK_ROWS = 10;
export const HOTELS_MORE_ID = "hotels:more";

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

/** Why the tappable list is shorter than the hotels that were found. */
export type HotelPickLimit = "whatsapp" | "short" | null;

export function hotelPickListBody(limit: HotelPickLimit): string {
  if (limit === "whatsapp") {
    return "واتساب لا يقبل أكثر من 10 خيارات في قائمة الضغط. هذه أول 10 فنادق، وللبقية اكتب اسم الفندق.";
  }
  if (limit === "short") {
    return "القائمة قصيرة ليسهل الاختيار، وليست كل الفنادق المتاحة. لبقية الفنادق اكتب: المزيد";
  }
  return "اضغط على الفندق لعرض الغرف والسعر.";
}

/** Hotels the customer can tap: the rows just shown, capped at WhatsApp's 10. */
export function visibleHotelPicks(input: {
  hotels?: CatalogHotel[];
  offset?: number;
  shownCount?: number;
}): { picks: HotelPick[]; truncated: boolean; limit: HotelPickLimit } {
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
  const limit: HotelPickLimit =
    slice.length > WHATSAPP_HOTEL_PICK_ROWS
      ? "whatsapp"
      : slice.length > 0 && slice.length < fromOffset.length
        ? "short"
        : null;
  return {
    picks: slice.slice(0, WHATSAPP_HOTEL_PICK_ROWS),
    truncated: limit === "whatsapp",
    limit,
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

export type HotelStaySummary = {
  location?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
};

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function formatStayDate(value?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!match) return String(value || "").trim();
  const month = ARABIC_MONTHS[Number(match[2]) - 1];
  if (!month) return String(value).trim();
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function partyLabel(adults?: number, children?: number): string {
  const grown = Math.max(1, Math.floor(adults || 1));
  const kids = Math.max(0, Math.floor(children || 0));
  const grownText =
    grown === 1 ? "بالغ واحد" : grown === 2 ? "بالغان" : `${grown} بالغين`;
  if (!kids) return grownText;
  const kidText = kids === 1 ? "طفل واحد" : kids === 2 ? "طفلان" : `${kids} أطفال`;
  return `${grownText} و${kidText}`;
}

/** One WhatsApp page: up to 10 hotels, or fewer when the result is shorter. */
export function hotelResultPage(input: {
  hotels?: CatalogHotel[];
  offset?: number;
  pageSize?: number;
}): { picks: HotelPick[]; offset: number; hasMore: boolean; total: number } {
  const offset = Math.max(0, Math.floor(input.offset || 0));
  const pageSize = Math.max(1, Math.floor(input.pageSize || WHATSAPP_HOTEL_PICK_ROWS));
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
  const picks = rows.slice(offset, offset + pageSize);
  return {
    picks,
    offset,
    hasMore: offset + picks.length < rows.length,
    total: rows.length,
  };
}

export function hotelPickCard(input: {
  stay?: HotelStaySummary;
  picks: HotelPick[];
  hasMore: boolean;
}): { header: string; body: string; footer?: string; button: string } {
  const stay = input.stay || {};
  const lines: string[] = [];
  const location = String(stay.location || "").trim();
  if (location) lines.push(location);
  const checkIn = formatStayDate(stay.checkInDate);
  const checkOut = formatStayDate(stay.checkOutDate);
  if (checkIn && checkOut) lines.push(`من ${checkIn} إلى ${checkOut}`);
  else if (checkIn) lines.push(`الوصول ${checkIn}`);
  lines.push(partyLabel(stay.adults, stay.children));
  lines.push("");
  input.picks.forEach((pick, index) => {
    const stars = pick.stars ? ` ★${pick.stars}` : "";
    lines.push(`${index + 1}. ${pick.name}${stars}`);
    const detail = hotelPickDescription(pick);
    if (detail) lines.push(detail);
  });
  if (input.hasMore) {
    lines.push("");
    lines.push("هذه 10 فنادق لأن واتساب لا يقبل أكثر من ذلك في البطاقة. اضغط زر المزيد للبقية.");
  }
  return {
    header: "الفنادق",
    body: lines.join("\n").trim(),
    footer: input.hasMore ? "اضغط زر المزيد للفنادق التالية" : undefined,
    button: "اختر الفندق",
  };
}

export function isHotelMoreRequest(text: string): boolean {
  const normalized = text.trim().replace(/[!!.؟?]/g, "").replace(/\s+/g, " ");
  return (
    normalized === "المزيد" ||
    normalized === "المزيد من الفنادق" ||
    normalized === "فنادق اكثر" ||
    normalized === "فنادق أكثر"
  );
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
