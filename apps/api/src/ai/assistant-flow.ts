import { currencyMinorFactor } from "@watesly-travel/shared";
import type { PassportScanFields } from "@watesly-travel/ai-core";

export const ASSISTANT_CAN_ISSUE = false;
export const ASSISTANT_HOLD_STATUS = "on_hold" as const;
export const PHOTO_PAGE_SIZE = 4;

export type HoldServiceType = "hotel" | "flight" | "transfer";

export type HoldItem = {
  pickId: string;
  serviceType: HoldServiceType;
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: number;
  sellAmountMinor: number;
  currency: string;
  revalidationToken: string;
  expiresAt?: string;
  snapshot: Record<string, string | number | boolean | null>;
};

export type AssistantTraveler = {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  passportNumber?: string;
  nationality?: string;
  birthDate?: string;
  passportExpiry?: string;
  confirmed: boolean;
};

export type AssistantPhotos = {
  hotelId: string;
  name: string;
  urls: string[];
  shown: number;
};

export type AssistantTrip = {
  location?: string;
  checkInDate?: string;
  checkOutDate?: string;
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  adults?: number;
  children?: number;
};

export type AssistantState = {
  trip: AssistantTrip;
  rooms: HoldItem[];
  flights: HoldItem[];
  transfers: HoldItem[];
  selected: HoldItem[];
  photos?: AssistantPhotos;
  travelers: AssistantTraveler[];
  awaitingPassport: boolean;
  awaitingNameFix: boolean;
  holdBookingId?: string;
  /** Distinct room types existed beyond the tappable list. */
  roomsTruncated?: boolean;
  /** First room index shown on the current WhatsApp card. */
  roomOffset: number;
  pendingLists: Array<"rooms" | "flights" | "transfers">;
};

export type AssistantAction =
  | { kind: "room" | "flight" | "transfer"; index: number }
  | { kind: "rooms-more" | "rooms-prev" | "rooms-terms" }
  | { kind: "photo"; more: boolean }
  | { kind: "traveler-ok" | "traveler-fix" | "traveler-another" | "traveler-confirm" }
  | { kind: "trip-hotel" | "trip-flight-only" | "trip-transfer" | "trip-no-transfer" };

type RateLike = {
  rateKey?: string;
  roomName?: string;
  boardName?: string;
  net?: number;
  sellingRate?: number;
  currency?: string;
  freeCancellation?: boolean;
  paymentType?: string;
  rateComments?: string;
  cancellationPolicies?: Array<{ amount?: number; from?: string; currency?: string }>;
  promotions?: Array<{ name?: string; remark?: string }>;
  taxes?: {
    allIncluded?: boolean;
    items?: Array<{ type?: string; amount?: number; currency?: string; included?: boolean }>;
  };
};

type OfferLike = {
  providerKey: string;
  providerOfferRef: string;
  description: string;
  costAmountMinor: number;
  sellAmountMinor?: number;
  currency: string;
  revalidationToken?: string;
  expiresAt?: string;
  raw?: unknown;
};

export function emptyAssistantState(): AssistantState {
  return {
    trip: {},
    rooms: [],
    flights: [],
    transfers: [],
    selected: [],
    travelers: [],
    awaitingPassport: false,
    awaitingNameFix: false,
    roomsTruncated: false,
    roomOffset: 0,
    pendingLists: [],
  };
}

export function readAssistantState(metadata: unknown): AssistantState {
  const base = emptyAssistantState();
  if (!metadata || typeof metadata !== "object") return base;
  const raw = (metadata as { assistant?: Partial<AssistantState> }).assistant;
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    trip: { ...base.trip, ...(raw.trip || {}) },
    rooms: Array.isArray(raw.rooms) ? raw.rooms : [],
    flights: Array.isArray(raw.flights) ? raw.flights : [],
    transfers: Array.isArray(raw.transfers) ? raw.transfers : [],
    selected: Array.isArray(raw.selected) ? raw.selected : [],
    travelers: Array.isArray(raw.travelers) ? raw.travelers : [],
    roomsTruncated: raw.roomsTruncated === true,
    roomOffset: Number.isFinite(Number(raw.roomOffset)) ? Math.max(0, Number(raw.roomOffset)) : 0,
    pendingLists: Array.isArray(raw.pendingLists) ? raw.pendingLists : [],
  };
}

export function parseAssistantAction(id?: string): AssistantAction | null {
  const raw = String(id || "").trim();
  const indexed = raw.match(/^(room|flight|transfer):(\d+)$/);
  if (indexed) {
    return {
      kind: indexed[1] as "room" | "flight" | "transfer",
      index: Number(indexed[2]),
    };
  }
  if (raw === ROOMS_MORE_ID) return { kind: "rooms-more" };
  if (raw === ROOMS_PREV_ID) return { kind: "rooms-prev" };
  if (raw === ROOMS_TERMS_ID) return { kind: "rooms-terms" };
  if (raw === "photo:more") return { kind: "photo", more: true };
  if (raw === "photo:hotel") return { kind: "photo", more: false };
  if (raw === "traveler:ok") return { kind: "traveler-ok" };
  if (raw === "traveler:fix") return { kind: "traveler-fix" };
  if (raw === "traveler:another") return { kind: "traveler-another" };
  if (raw === "traveler:confirm") return { kind: "traveler-confirm" };
  if (raw === "trip:hotel") return { kind: "trip-hotel" };
  if (raw === "trip:flight-only") return { kind: "trip-flight-only" };
  if (raw === "trip:transfer") return { kind: "trip-transfer" };
  if (raw === "trip:no-transfer") return { kind: "trip-no-transfer" };
  return null;
}

function moneyLabel(minor: number, currency: string): string {
  const major = minor / currencyMinorFactor(currency);
  const text = Number.isInteger(major) ? String(major) : major.toFixed(currencyMinorFactor(currency) === 1000 ? 3 : 2);
  return `${text} ${currency}`.trim();
}

function scaledSell(rateMinor: number, offerCost: number, offerSell: number): number {
  if (offerCost <= 0) return rateMinor;
  return Math.max(0, Math.round((rateMinor * offerSell) / offerCost));
}

export type RoomSelection = {
  items: HoldItem[];
  all: HoldItem[];
  uniqueCount: number;
  truncated: boolean;
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

function policyDate(value?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!match) return "";
  const month = ARABIC_MONTHS[Number(match[2]) - 1];
  return month ? `${Number(match[3])} ${month} ${match[1]}` : "";
}

function clipNote(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function paidPolicy(rate: RateLike) {
  return (rate.cancellationPolicies || []).find((policy) => Number(policy.amount) > 0);
}

function extraCharges(rate: RateLike): string {
  const items = (rate.taxes?.items || []).filter(
    (item) => item.included === false && Number(item.amount) > 0,
  );
  if (items.length) {
    return items
      .map((item) => `${item.type || "رسوم"} ${item.amount} ${item.currency || ""}`.trim())
      .join(" · ");
  }
  return rate.taxes?.allIncluded ? "الرسوم مشمولة في السعر" : "";
}

function paymentLine(value?: string): string {
  const key = String(value || "").toUpperCase();
  if (key === "AT_HOTEL") return "الدفع في الفندق";
  if (key === "AT_WEB") return "الدفع مقدماً";
  return "";
}

/** What the customer can recover, from the supplier policy already stored on the rate. */
export function refundLabel(item: HoldItem): string {
  const free = item.snapshot.freeCancellation === true;
  const from = policyDate(String(item.snapshot.cancelFrom || ""));
  if (free && from) return `مستردة حتى ${from}`;
  if (free) return "مستردة";
  return "غير مستردة";
}

export function roomTermsText(items: HoldItem[]): string {
  const blocks = items.map((item) => {
    const name = String(item.snapshot.roomName || "الغرفة");
    const lines = [`🏨 *${name}*`, `الاسترجاع: ${refundLabel(item)}`];
    const amount = Number(item.snapshot.cancelAmount);
    const from = policyDate(String(item.snapshot.cancelFrom || ""));
    if (Number.isFinite(amount) && amount > 0 && from) {
      const currency = String(item.snapshot.cancelCurrency || item.currency || "");
      lines.push(`بعد ${from} تُخصم ${amount} ${currency}`.trim());
    }
    const terms = String(item.snapshot.rateNote || "").trim();
    lines.push(terms ? `الشروط: ${terms}` : "الشروط: لا توجد شروط إضافية من المورّد.");
    const extras = String(item.snapshot.extras || "").trim();
    if (extras) lines.push(`ملاحظات: ${extras}`);
    const charges = String(item.snapshot.taxNote || "").trim();
    if (charges) lines.push(charges.startsWith("الرسوم") ? charges : `رسوم غير مشمولة: ${charges}`);
    const payment = String(item.snapshot.paymentNote || "").trim();
    if (payment) lines.push(payment);
    return lines.join("\n");
  });
  if (!blocks.length) return "";
  return ["شروط الغرف والاسترجاع كما وصلت من المورّد:", ...blocks].join("\n\n");
}

export function roomTermsPages(items: HoldItem[], max = 3500): string[] {
  const text = roomTermsText(items);
  if (!text) return [];
  if (text.length <= max) return [text];
  const pages: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const cut = rest.lastIndexOf("\n\n", max);
    const at = cut > 200 ? cut : max;
    pages.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) pages.push(rest);
  return pages;
}

export const ROOM_PAGE_SIZE = 10;
export const ROOMS_MORE_ID = "rooms:more";
export const ROOMS_PREV_ID = "rooms:prev";
export const ROOMS_TERMS_ID = "rooms:terms";
export const ROOM_ACTION_BODY = "\u2060";

const LRI = "\u2066";
const PDI = "\u2069";
const RLM = "\u200F";
const ROOM_BODY_LIMIT = 1024;

function isolateLatin(value: string): string {
  return `${LRI}${value}${PDI}`;
}

function refundDetail(item: HoldItem): string {
  const amount = Number(item.snapshot.cancelAmount);
  const from = policyDate(String(item.snapshot.cancelFrom || ""));
  if (!Number.isFinite(amount) || amount <= 0 || !from) return "";
  const currency = String(item.snapshot.cancelCurrency || item.currency || "");
  return `${RLM}بعد ${from} يُخصم ${isolateLatin(`${amount} ${currency}`.trim())}`;
}

function clipName(name: string, max: number): string {
  const chars = Array.from(name);
  if (chars.length <= max) return name;
  return `${chars.slice(0, Math.max(1, max - 1)).join("")}…`;
}

function roomBlock(item: HoldItem, index: number, detailed: boolean, nameMax = 80): string {
  const name = clipName(String(item.snapshot.roomName || "الغرفة"), nameMax);
  const board = String(item.snapshot.boardName || "غرفة");
  const lines = [
    `${RLM}${index}. *${name}*`,
    `${RLM}الإقامة: ${board}`,
    `${RLM}السعر: ${isolateLatin(moneyLabel(item.sellAmountMinor, item.currency))}`,
    `${RLM}الاسترجاع: ${refundLabel(item)}`,
  ];
  if (detailed) {
    const detail = refundDetail(item);
    if (detail) lines.push(detail);
  }
  return lines.join("\n");
}

export function roomResultBody(items: HoldItem[], startIndex = 1): string {
  const attempts: Array<[boolean, number, string]> = [];
  for (const nameMax of [80, 36, 24, 16]) {
    for (const detailed of [true, false]) {
      for (const separator of ["\n\n", "\n"]) {
        attempts.push([detailed, nameMax, separator]);
      }
    }
  }
  for (const [detailed, nameMax, separator] of attempts) {
    const text = items
      .map((item, index) => roomBlock(item, startIndex + index, detailed, nameMax))
      .join(separator);
    if (Array.from(text).length <= ROOM_BODY_LIMIT) return text;
  }
  return items
    .map((item, index) => roomBlock(item, startIndex + index, false, 12))
    .join("\n");
}

export function roomPage(rooms: HoldItem[], offset = 0) {
  const start = Math.max(0, offset);
  const aligned = Math.floor(start / ROOM_PAGE_SIZE) * ROOM_PAGE_SIZE;
  const slice = rooms.slice(aligned, aligned + ROOM_PAGE_SIZE);
  return {
    rooms: slice,
    offset: aligned,
    hasMore: aligned + ROOM_PAGE_SIZE < rooms.length,
    nextOffset: aligned + ROOM_PAGE_SIZE,
  };
}

export function isRoomMoreRequest(text: string): boolean {
  const normalized = text.trim().replace(/[!.؟?]/g, "").replace(/\s+/g, " ");
  return normalized === "المزيد من الغرف" || normalized === "غرف اكثر" || normalized === "غرف أكثر";
}

export function isRoomTermsRequest(text: string): boolean {
  const normalized = text.trim().replace(/[!.؟?]/g, "").replace(/\s+/g, " ");
  return (
    normalized === "قراءة الشروط" ||
    normalized === "قراءه الشروط" ||
    normalized === "شروط الغرف" ||
    normalized === "شروط الغرفة"
  );
}

export function isRoomPrevRequest(text: string): boolean {
  const normalized = text.trim().replace(/[!.؟?]/g, "").replace(/\s+/g, " ");
  return normalized === "الغرف السابقة";
}

export type RoomChoiceCard = {
  header: string;
  sectionTitle: string;
  body: string;
  button: string;
  rows: Array<{ id: string; title: string; description?: string }>;
  hasMore: boolean;
  buttons: Array<{ id: string; title: string }>;
};

export function roomChoiceCard(
  rooms: HoldItem[],
  offset = 0,
  hotelName?: string,
): RoomChoiceCard | null {
  const page = roomPage(rooms, offset);
  if (!page.rooms.length) return null;
  const buttons: Array<{ id: string; title: string }> = [
    { id: ROOMS_TERMS_ID, title: "قراءة الشروط" },
  ];
  if (page.hasMore) buttons.push({ id: ROOMS_MORE_ID, title: "المزيد من الغرف" });
  else if (page.offset > 0) buttons.push({ id: ROOMS_PREV_ID, title: "الغرف السابقة" });
  if (page.hasMore && page.offset > 0) {
    buttons.push({ id: ROOMS_PREV_ID, title: "الغرف السابقة" });
  } else {
    buttons.push({ id: "photo:hotel", title: "صور الفندق" });
  }
  const name = String(hotelName || "").trim();
  return {
    header: Array.from(name).slice(0, 60).join("") || "الغرف",
    sectionTitle: "الغرف",
    body: roomResultBody(page.rooms, page.offset + 1),
    button: "اختر الغرفة",
    rows: choiceRows(page.rooms),
    hasMore: page.hasMore,
    buttons: buttons.slice(0, 3),
  };
}

export function hotelRoomSelection(offer: OfferLike, limit = 10): RoomSelection {
  const all = collectHotelRooms(offer);
  return {
    all,
    items: all.slice(0, limit).map((item, index) => ({
      ...item,
      pickId: `room:${index}`,
    })),
    uniqueCount: all.length,
    truncated: all.length > limit,
  };
}

export function hotelRoomItems(offer: OfferLike, limit = 10): HoldItem[] {
  return hotelRoomSelection(offer, limit).items;
}

/** A typed room name selects that type when the tap list could not show it. */
export function roomByTypedName(rooms: HoldItem[], text: string): HoldItem | null {
  const typed = text.trim().replace(/\s+/g, " ");
  if (typed.length < 2 || typed.length > 80) return null;
  const hits = rooms.filter((room) => {
    const name = String(room.snapshot.roomName || "").trim();
    return name.length >= 2 && mentionsRoomName(typed, name);
  });
  if (hits.length !== 1) return null;
  const name = String(hits[0]?.snapshot.roomName || "").trim();
  if (typed.length > name.length + 12) return null;
  return hits[0] || null;
}

function mentionsRoomName(typed: string, name: string): boolean {
  const hay = typed.toLowerCase();
  const needle = name.toLowerCase();
  const at = hay.indexOf(needle);
  if (at < 0) return false;
  const next = hay[at + needle.length] || "";
  if (!next) return true;
  if (/\d$/.test(needle)) return !/\d/.test(next);
  return /[\s،,.!?)]/.test(next);
}

function collectHotelRooms(offer: OfferLike): HoldItem[] {
  const raw = (offer.raw || {}) as {
    name?: string;
    hotelCode?: string;
    checkInDate?: string;
    checkOutDate?: string;
    rateOptions?: RateLike[];
  };
  const factor = currencyMinorFactor(offer.currency);
  const offerCost = offer.costAmountMinor;
  const offerSell = offer.sellAmountMinor ?? offerCost;
  const rates = [...(raw.rateOptions || [])]
    .filter((rate) => rate.roomName && Number(rate.net || rate.sellingRate) > 0)
    .sort((a, b) => Number(a.net || a.sellingRate) - Number(b.net || b.sellingRate));
  const seen = new Set<string>();
  const items: HoldItem[] = [];
  for (const rate of rates) {
    const key = `${rate.roomName}|${rate.boardName || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const major = Number(rate.sellingRate || rate.net);
    const cost = Math.round(major * factor);
    const sell = scaledSell(cost, offerCost, offerSell);
    const penalty = paidPolicy(rate);
    const extras = (rate.promotions || [])
      .map((promo) => promo.remark || promo.name || "")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" · ");
    items.push({
      pickId: `room:${items.length}`,
      serviceType: "hotel",
      providerKey: offer.providerKey,
      providerOfferRef: offer.providerOfferRef,
      description: `${raw.name || offer.description} · ${rate.roomName} · ${rate.boardName || "غرفة"}`,
      costAmountMinor: cost,
      sellAmountMinor: sell,
      currency: offer.currency,
      revalidationToken: rate.rateKey || offer.revalidationToken || "",
      expiresAt: offer.expiresAt,
      snapshot: {
        hotelName: raw.name || offer.description,
        hotelCode: raw.hotelCode || offer.providerOfferRef,
        roomName: rate.roomName || "",
        boardName: rate.boardName || "",
        rateKey: rate.rateKey || "",
        checkInDate: raw.checkInDate || "",
        checkOutDate: raw.checkOutDate || "",
        freeCancellation: Boolean(rate.freeCancellation),
        cancelFrom: penalty?.from || "",
        cancelAmount: Number(penalty?.amount) > 0 ? Number(penalty?.amount) : 0,
        cancelCurrency: penalty?.currency || rate.currency || offer.currency,
        rateNote: clipNote(String(rate.rateComments || ""), 400),
        extras: clipNote(extras, 240),
        taxNote: clipNote(extraCharges(rate), 240),
        paymentNote: paymentLine(rate.paymentType),
      },
    });
  }
  return items;
}

export function transportItems(
  rows: OfferLike[],
  serviceType: "flight" | "transfer",
  limit = 10,
): HoldItem[] {
  return rows.slice(0, limit).map((row, index) => {
    const raw = (row.raw || {}) as Record<string, unknown>;
    const text = (value: unknown) => (value == null ? "" : String(value));
    return {
      pickId: `${serviceType}:${index}`,
      serviceType,
      providerKey: row.providerKey,
      providerOfferRef: row.providerOfferRef,
      description: row.description,
      costAmountMinor: row.costAmountMinor,
      sellAmountMinor: row.sellAmountMinor ?? row.costAmountMinor,
      currency: row.currency,
      revalidationToken: row.revalidationToken || "",
      expiresAt: row.expiresAt,
      snapshot: {
        origin: text(raw.origin || raw.fromLabel),
        destination: text(raw.destination || raw.toLabel),
        departAt: text(raw.departAt || raw.outboundAt),
        carrier: text(raw.carrier),
        flightNumber: text(raw.flightNumber),
        summary: row.description,
      },
    };
  });
}

export function choiceRows(items: HoldItem[]) {
  return items.slice(0, 10).map((item) => ({
    id: item.pickId,
    title: item.snapshot.roomName
      ? String(item.snapshot.roomName)
      : item.snapshot.flightNumber
        ? `${item.snapshot.carrier || ""} ${item.snapshot.flightNumber}`.trim()
        : item.description,
    description: [
      item.snapshot.boardName ? String(item.snapshot.boardName) : "",
      moneyLabel(item.sellAmountMinor, item.currency),
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}

export function selectItem(state: AssistantState, item: HoldItem): AssistantState {
  const selected = state.selected.filter((row) => row.serviceType !== item.serviceType);
  selected.push(item);
  return {
    ...state,
    selected,
    holdBookingId: undefined,
    awaitingPassport: state.travelers.some((row) => row.confirmed) ? false : true,
  };
}

export function confirmedTravelers(state: AssistantState): AssistantTraveler[] {
  return state.travelers.filter((row) => row.confirmed && row.firstName);
}

export function holdBlockReason(state: AssistantState): string | null {
  if (!state.selected.length) return "اختر الغرفة أو الرحلة أولاً.";
  if (!confirmedTravelers(state).length) {
    return "أرسل صورة جواز كل مسافر. سأقرأ الاسم وأراجعه معك قبل تسجيل الطلب.";
  }
  if (state.holdBookingId) return "طلب الحجز مسجّل وبانتظار تأكيد الموظف. لن يُؤكَّد قبل مراجعته.";
  return null;
}

export function travelerFromPassport(fields: PassportScanFields, index: number): AssistantTraveler | null {
  const firstName = fields.firstName?.trim() || "";
  const lastName = fields.lastName?.trim() || "";
  if (!firstName && !lastName && !fields.passportNumber) return null;
  return {
    id: `pax-${index + 1}`,
    firstName: firstName || "مسافر",
    lastName,
    title: fields.title,
    passportNumber: fields.passportNumber,
    nationality: fields.nationality,
    birthDate: fields.birthDate,
    passportExpiry: fields.passportExpiry,
    confirmed: false,
  };
}

export function upsertTraveler(state: AssistantState, traveler: AssistantTraveler): AssistantState {
  const travelers = state.travelers.filter(
    (row) => !traveler.passportNumber || row.passportNumber !== traveler.passportNumber,
  );
  traveler.id = `pax-${travelers.length + 1}`;
  travelers.push(traveler);
  return { ...state, travelers, awaitingPassport: false, awaitingNameFix: false };
}

export function confirmLatestTraveler(state: AssistantState): AssistantState {
  const travelers = state.travelers.map((row, index) =>
    index === state.travelers.length - 1 ? { ...row, confirmed: true } : row,
  );
  return { ...state, travelers };
}

export function confirmAllTravelers(state: AssistantState): AssistantState {
  return {
    ...state,
    travelers: state.travelers.map((row) => ({ ...row, confirmed: true })),
    awaitingPassport: false,
    awaitingNameFix: false,
  };
}

export function applyNameFix(state: AssistantState, typed: string): AssistantState {
  const parts = typed.trim().split(/\s+/).filter(Boolean);
  if (!parts.length || !state.travelers.length) return state;
  const travelers = [...state.travelers];
  const last = { ...travelers[travelers.length - 1]! };
  if (parts.length === 1) {
    last.firstName = parts[0]!;
  } else {
    last.lastName = parts[parts.length - 1]!;
    last.firstName = parts.slice(0, -1).join(" ");
  }
  last.confirmed = false;
  travelers[travelers.length - 1] = last;
  return { ...state, travelers, awaitingNameFix: false };
}

export function travelerReview(traveler: AssistantTraveler): string {
  const name = `${traveler.firstName} ${traveler.lastName}`.trim();
  return [
    "قرأت الجواز كالتالي:",
    `الاسم: ${name}`,
    traveler.passportNumber ? `رقم الجواز: ${traveler.passportNumber}` : "",
    traveler.nationality ? `الجنسية: ${traveler.nationality}` : "",
    traveler.birthDate ? `تاريخ الميلاد: ${traveler.birthDate}` : "",
    traveler.passportExpiry ? `انتهاء الجواز: ${traveler.passportExpiry}` : "",
    "هل الاسم صحيح كما هو مطبوع في الجواز؟",
  ]
    .filter(Boolean)
    .join("\n");
}

export function travelerRoster(state: AssistantState): string {
  if (!state.travelers.length) return "لا يوجد مسافرون بعد.";
  return state.travelers
    .map((row, index) => {
      const mark = row.confirmed ? "معتمد" : "بانتظار التأكيد";
      return `${index + 1}. ${row.firstName} ${row.lastName}`.trim() + ` — ${mark}`;
    })
    .join("\n");
}

export function nextPhotoSlice(photos: AssistantPhotos | undefined, more: boolean) {
  const urls = photos?.urls || [];
  const start = more ? photos?.shown || 0 : 0;
  const slice = urls.slice(start, start + PHOTO_PAGE_SIZE);
  return {
    name: photos?.name || "الفندق",
    urls: slice,
    shown: start + slice.length,
    exhausted: more && start >= urls.length,
  };
}

export function tripMemoryLine(state: AssistantState): string {
  const trip = state.trip;
  const parts = [
    trip.location ? `المكان ${trip.location}` : "",
    trip.checkInDate ? `الدخول ${trip.checkInDate}` : "",
    trip.checkOutDate ? `الخروج ${trip.checkOutDate}` : "",
    trip.origin && trip.destination ? `الرحلة ${trip.origin} إلى ${trip.destination}` : "",
    trip.departDate ? `الذهاب ${trip.departDate}` : "",
    trip.returnDate ? `العودة ${trip.returnDate}` : "",
    trip.adults ? `البالغون ${trip.adults}` : "",
    state.selected.find((row) => row.serviceType === "hotel")
      ? `الفندق المختار ${state.selected.find((row) => row.serviceType === "hotel")?.snapshot.hotelName || ""}`
      : "",
  ].filter(Boolean);
  if (!parts.length) return "";
  return `سياق محفوظ، لا تبدأ من الصفر إذا غيّر العميل التاريخ أو العدد: ${parts.join("، ")}.`;
}

export function hotelFollowUpText(state: AssistantState): string {
  const trip = state.trip;
  const place = trip.destination || trip.location || "";
  const depart = trip.departDate || trip.checkInDate || "";
  const ret = trip.returnDate || trip.checkOutDate || "";
  const adults = trip.adults || confirmedTravelers(state).length || 1;
  return `أريد فندقاً في ${place} من ${depart} إلى ${ret} لـ ${adults} بالغ. ابحث بالأرخص مباشرة ولا تسأل الأقرب أم الأرخص.`;
}

export function transferFollowUpText(state: AssistantState): string {
  const trip = state.trip;
  const city = trip.destination || trip.location || "";
  const hotel = state.selected.find((row) => row.serviceType === "hotel");
  const when = trip.departDate || trip.checkInDate || "";
  return `أريد توصيل مطار ${city} إلى ${hotel?.snapshot.hotelName || "الفندق"} بتاريخ ${when}.`;
}

export function holdCustomerMessage(items: HoldItem[]): string {
  const lines = items.map(
    (item) => `• ${item.description} — ${moneyLabel(item.sellAmountMinor, item.currency)}`,
  );
  const terms = roomTermsText(items.filter((item) => item.serviceType === "hotel"));
  return [
    "تم تسجيل طلب الحجز وهو بانتظار تأكيد الموظف.",
    ...lines,
    terms,
    "لن يُؤكَّد الحجز ولن يُصدر قبل مراجعة الفريق.",
  ]
    .filter(Boolean)
    .join("\n");
}
