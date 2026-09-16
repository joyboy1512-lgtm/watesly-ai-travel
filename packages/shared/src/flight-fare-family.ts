/** Airline branded fares (Jazeera Flex / KU Saver / Business) — not OTA comparison. */

export type FlightFareOption = {
  id: string;
  providerKey: string;
  brandKey: string;
  brandName: string;
  brandNameAr: string;
  cabin: string;
  cabinLabelAr: string;
  sellAmountMinor: number;
  currency: string;
  cabinBag?: string;
  checkedBag?: string;
  changeable?: boolean;
  refundable?: boolean;
  changeNoteAr?: string;
  refundNoteAr?: string;
  noteAr?: string;
};

const CABIN_AR: Record<string, string> = {
  economy: "الاقتصادية",
  premium_economy: "اقتصادية مميزة",
  business: "رجال الأعمال",
  first: "الأولى",
};

const BRAND_AR: Record<string, string> = {
  saver: "الموفّرة",
  flex: "المرنة",
  flexi: "المرنة",
  flex_plus: "فلكس بلس",
  comfort: "كومفورت",
  economy: "الاقتصادية",
  economy_class: "الدرجة الاقتصادية",
  business: "رجال الأعمال",
  business_saver: "أعمال موفّرة",
  premium_economy: "اقتصادية مميزة",
  first: "الأولى",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeCabinClass(cabin?: string | null): string {
  const c = String(cabin || "economy").toLowerCase();
  if (c.includes("first") || c.includes("أولى")) return "first";
  if (c.includes("business") || c.includes("أعمال")) return "business";
  if (c.includes("premium")) return "premium_economy";
  return "economy";
}

export function cabinLabelAr(cabin?: string | null): string {
  const key = normalizeCabinClass(cabin);
  return CABIN_AR[key] || "الاقتصادية";
}

export function normalizeFareBrandKey(name?: string | null): string {
  const n = String(name || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9+أ-ي ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!n) return "";
  if (/flex\s*\+|flex\s*plus|فلكس\s*بلس/.test(n)) return "flex_plus";
  if (/business\s*saver|أعمال\s*موف/.test(n)) return "business_saver";
  if (/\bsaver\b|\bsave\b|ecosave|موفّر|موفرة/.test(n) && /business|أعمال/.test(n)) {
    return "business_saver";
  }
  if (/\bsaver\b|\bsave\b|ecosave|موفّر|موفرة/.test(n)) return "saver";
  if (/comfort|كومفورت/.test(n)) return "comfort";
  if (/\bflexi|\bflex\b|flexible|فلكس|مرن/.test(n)) return "flex";
  if (/premium/.test(n)) return "premium_economy";
  if (/business|رجال/.test(n)) return "business";
  if (/first|أولى/.test(n)) return "first";
  if (/economy\s*class|درجة\s*اقتصاد/.test(n)) return "economy_class";
  if (/economy|اقتصاد/.test(n)) return "economy";
  return n.replace(/\s+/g, "_");
}

export function fareBrandLabelAr(brandKey: string, originalName?: string): string {
  const name = String(originalName || "").trim();
  const hint = BRAND_AR[brandKey];
  if (name && hint && !name.includes(hint)) return `${name} · ${hint}`;
  if (name) return name;
  if (hint) return hint;
  return brandKey.replace(/_/g, " ") || "الفئة المتاحة";
}

export function pickDefaultFareOption(
  options: FlightFareOption[],
  preferredId?: string | null,
  requestedCabin?: string | null,
): FlightFareOption | null {
  if (!options.length) return null;
  if (preferredId) {
    const match = options.find((row) => row.id === preferredId);
    if (match) return match;
  }
  const cabin = requestedCabin ? normalizeCabinClass(requestedCabin) : "";
  if (cabin) {
    const match = options.find((row) => row.cabin === cabin);
    if (match) return match;
  }
  return options[0]!;
}

export function fareFamilyKey(cabin: string, brandKey: string): string {
  const cabinKey = normalizeCabinClass(cabin);
  const brand = brandKey || cabinKey;
  return `${cabinKey}|${brand}`;
}

function firstSlice(offer: Record<string, unknown>): Record<string, unknown> {
  const slices = offer.slices;
  if (!Array.isArray(slices) || !slices[0] || typeof slices[0] !== "object") return {};
  return slices[0] as Record<string, unknown>;
}

function firstPassenger(offer: Record<string, unknown>): Record<string, unknown> {
  const slice = firstSlice(offer);
  const segs = slice.segments;
  if (!Array.isArray(segs) || !segs[0] || typeof segs[0] !== "object") return {};
  const pax = (segs[0] as Record<string, unknown>).passengers;
  if (!Array.isArray(pax) || !pax[0] || typeof pax[0] !== "object") return {};
  return pax[0] as Record<string, unknown>;
}

function duffelBagLabel(
  bags: unknown,
  type: "carry_on" | "checked",
): string | undefined {
  if (!Array.isArray(bags)) return undefined;
  const match = bags.find((row) => {
    const rec = asRecord(row);
    const t = String(rec.type || "");
    if (type === "carry_on") return t === "carry_on" || t === "carry_on_foldable";
    return t === "checked";
  });
  if (!match) return undefined;
  const qty = Number(asRecord(match).quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return type === "checked" ? "أمتعة مسجّلة غير مشمولة" : "حقيبة مقصورة حسب الفئة";
  }
  return type === "checked"
    ? `${qty} حقيبة مسجّلة`
    : `${qty} حقيبة مقصورة`;
}

function conditionNote(
  raw: unknown,
  allowedWord: string,
  blockedWord: string,
): { allowed?: boolean; note?: string } {
  const rec = asRecord(raw);
  if (!raw || typeof raw !== "object") return {};
  const allowed = rec.allowed === true;
  const amount = rec.penalty_amount != null ? String(rec.penalty_amount) : "";
  const currency = rec.penalty_currency != null ? String(rec.penalty_currency) : "";
  if (allowed && amount) {
    return { allowed: true, note: `${allowedWord} مقابل ${amount} ${currency}`.trim() };
  }
  if (allowed) return { allowed: true, note: allowedWord };
  return { allowed: false, note: blockedWord };
}

function amadeusBrandedFare(offer: Record<string, unknown>): string {
  const pricings = offer.travelerPricings;
  if (!Array.isArray(pricings) || !pricings[0]) return "";
  const details = asRecord(pricings[0]).fareDetailsBySegment;
  if (!Array.isArray(details) || !details[0]) return "";
  return String(asRecord(details[0]).brandedFare || asRecord(details[0]).fareBasis || "");
}

function amadeusCabin(offer: Record<string, unknown>): string {
  const pricings = offer.travelerPricings;
  if (!Array.isArray(pricings) || !pricings[0]) return "";
  const details = asRecord(pricings[0]).fareDetailsBySegment;
  if (!Array.isArray(details) || !details[0]) return "";
  return String(asRecord(details[0]).cabin || "");
}

/** Read branded fare + cabin + bags from a mapped offer.raw (Duffel / Amadeus / mock). */
export function extractFareFamilyFromRaw(raw: Record<string, unknown> | null | undefined): {
  brandName: string;
  brandKey: string;
  cabin: string;
  cabinBag?: string;
  checkedBag?: string;
  changeable?: boolean;
  refundable?: boolean;
  changeNoteAr?: string;
  refundNoteAr?: string;
  noteAr?: string;
} {
  const rec = asRecord(raw);
  const nested = asRecord(rec.offer);
  const pax = firstPassenger(nested);
  const bags = pax.baggages;
  const baggage = asRecord(rec.baggage);
  const policies = asRecord(rec.policies);
  const conditions = asRecord(nested.conditions);

  const cabin =
    String(rec.cabinClass || rec.cabin || pax.cabin_class || amadeusCabin(nested) || "economy");
  const brandName = String(
    rec.fareBrand ||
      rec.fare_brand_name ||
      firstSlice(nested).fare_brand_name ||
      pax.cabin_class_marketing_name ||
      amadeusBrandedFare(nested) ||
      rec.cabin ||
      "",
  ).trim();

  const change = conditionNote(
    conditions.change_before_departure,
    "يمكن التعديل",
    "التعديل غير متاح",
  );
  const refund = conditionNote(
    conditions.refund_before_departure,
    "يمكن الاسترداد",
    "غير قابلة للاسترداد",
  );

  const brandKey = normalizeFareBrandKey(brandName) || normalizeCabinClass(cabin);
  const changeable =
    change.allowed ??
    (typeof policies.changeable === "boolean" ? policies.changeable : undefined);
  const refundable =
    refund.allowed ??
    (typeof policies.refundable === "boolean" ? policies.refundable : undefined);

  return {
    brandName: brandName || cabinLabelAr(cabin),
    brandKey,
    cabin: normalizeCabinClass(cabin),
    cabinBag:
      duffelBagLabel(bags, "carry_on") ||
      (typeof baggage.cabin === "string" ? baggage.cabin : undefined),
    checkedBag:
      duffelBagLabel(bags, "checked") ||
      (typeof baggage.checked === "string" ? baggage.checked : undefined),
    changeable,
    refundable,
    changeNoteAr:
      change.note ||
      (changeable === true ? "يمكن التعديل" : changeable === false ? "التعديل غير متاح" : undefined),
    refundNoteAr:
      refund.note ||
      (refundable === true ? "يمكن الاسترداد" : refundable === false ? "غير قابلة للاسترداد" : undefined),
    noteAr: typeof policies.noteAr === "string" ? policies.noteAr : undefined,
  };
}

export function toFlightFareOption(input: {
  id: string;
  providerKey: string;
  sellAmountMinor: number;
  currency: string;
  raw?: Record<string, unknown> | null;
}): FlightFareOption {
  const extracted = extractFareFamilyFromRaw(input.raw);
  return {
    id: input.id,
    providerKey: input.providerKey,
    brandKey: extracted.brandKey,
    brandName: extracted.brandName,
    brandNameAr: fareBrandLabelAr(extracted.brandKey, extracted.brandName),
    cabin: extracted.cabin,
    cabinLabelAr: cabinLabelAr(extracted.cabin),
    sellAmountMinor: input.sellAmountMinor,
    currency: input.currency,
    cabinBag: extracted.cabinBag,
    checkedBag: extracted.checkedBag,
    changeable: extracted.changeable,
    refundable: extracted.refundable,
    changeNoteAr: extracted.changeNoteAr,
    refundNoteAr: extracted.refundNoteAr,
    noteAr: extracted.noteAr,
  };
}

export function listFareOptionsFromDetails(details: Record<string, unknown> | null | undefined): FlightFareOption[] {
  const rec = asRecord(details);
  if (!Array.isArray(rec.fareOptions)) return [];
  return rec.fareOptions
    .map((row) => {
      const item = asRecord(row);
      if (!item.id || item.sellAmountMinor == null) return null;
      return item as unknown as FlightFareOption;
    })
    .filter((row): row is FlightFareOption => Boolean(row))
    .sort((a, b) => a.sellAmountMinor - b.sellAmountMinor);
}
