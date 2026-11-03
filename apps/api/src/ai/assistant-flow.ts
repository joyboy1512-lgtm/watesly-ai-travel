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
  pendingLists: Array<"rooms" | "flights" | "transfers">;
};

export type AssistantAction =
  | { kind: "room" | "flight" | "transfer"; index: number }
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

export function hotelRoomItems(offer: OfferLike, limit = 10): HoldItem[] {
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
      },
    });
    if (items.length >= limit) break;
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
      item.snapshot.freeCancellation ? "إلغاء مجاني" : "",
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
  return `أريد فندقاً في ${place} من ${depart} إلى ${ret} لـ ${adults} بالغ. اسأل الأقرب أو الأرخص إذا لم أحدد.`;
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
  return [
    "تم تسجيل طلب الحجز وهو بانتظار تأكيد الموظف.",
    ...lines,
    "لن يُؤكَّد الحجز ولن يُصدر قبل مراجعة الفريق.",
  ].join("\n");
}
