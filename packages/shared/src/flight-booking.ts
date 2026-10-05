/**
 * Shop flight-booking helpers: itinerary facts, passenger checks, extras,
 * price lines, and lifecycle labels. Do not invent allowances or tickets.
 */

export type FlightInclusionStatus = "included" | "not_included" | "unknown";

export type FlightInclusion = {
  status: FlightInclusionStatus;
  labelAr: string;
  count?: number;
  weightKg?: number;
};

export type FlightBagAllowance = {
  personal: FlightInclusion;
  cabin: FlightInclusion;
  checked: FlightInclusion;
};

export type FlightSegmentFact = {
  from: string;
  to: string;
  departAt?: string;
  arriveAt?: string;
  departClock: string;
  arriveClock: string;
  departDate: string;
  arriveDate: string;
  nextDayArrival: boolean;
  marketingAirlineCode?: string;
  marketingAirlineName?: string;
  operatingAirlineCode?: string;
  operatingAirlineName?: string;
  codeshare: boolean;
  flightNumber?: string;
  durationLabel?: string;
  aircraft?: string;
};

export type FlightLegFact = {
  kind: "outbound" | "return";
  titleAr: string;
  from: string;
  to: string;
  stops: number;
  durationLabel: string;
  segments: FlightSegmentFact[];
  airportChange: boolean;
  selfConnect: boolean;
  separateTickets: boolean;
  bags: FlightBagAllowance;
};

export type FlightFareFact = {
  cabinLabelAr: string;
  brandName?: string;
  benefits: string[];
  change: FlightInclusion;
  cancel: FlightInclusion;
  noShow: FlightInclusion;
};

export type FlightShopLifecycle =
  | "checking"
  | "paying"
  | "booking"
  | "issuing"
  | "ticketed"
  | "needs_followup"
  | "failed";

export const FLIGHT_SHOP_LIFECYCLE_AR: Record<FlightShopLifecycle, string> = {
  checking: "جارٍ التحقق",
  paying: "جارٍ الدفع",
  booking: "جارٍ الحجز",
  issuing: "جارٍ الإصدار",
  ticketed: "صدرت التذاكر",
  needs_followup: "يحتاج متابعة",
  failed: "تعذّر التنفيذ",
};

export type FlightExtraKind = "bag" | "seat" | "meal" | "fare_upgrade";

export type FlightOfferExtra = {
  id: string;
  kind: FlightExtraKind;
  labelAr: string;
  amountMinor: number;
  currency: string;
  passengerIndex?: number;
  segmentKey?: string;
  /** Seats are requests until the ticket is issued. */
  seatConfirmed: false;
};

export type FlightTravelerType = "adult" | "child" | "infant";

export type FlightTravelerInput = {
  type: FlightTravelerType;
  title?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  nationality?: string;
  gender?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportExpiry?: string;
};

export type FlightFieldErrors = Partial<
  Record<
    | "firstName"
    | "lastName"
    | "birthDate"
    | "type"
    | "nationality"
    | "passportNumber"
    | "passportIssueDate"
    | "passportExpiry"
    | "gender"
    | "email"
    | "phone"
    | "contactName",
    string
  >
>;

export type FlightPriceBreakdown = {
  ticketsMinor: number;
  taxesMinor: number;
  serviceFeeMinor: number;
  extrasMinor: number;
  totalMinor: number;
  currency: string;
};

const ZERO_WORDS = /^(0|٠|zero|-)$/i;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function clockFrom(value?: string): string {
  if (!value) return "";
  const m = value.match(/(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : "";
}

function dateFrom(value?: string): string {
  if (!value) return "";
  const d = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return d ? d[1]! : "";
}

export function inclusionFromProvider(raw: unknown): FlightInclusion {
  if (raw == null || raw === "") {
    return { status: "unknown", labelAr: "المعلومة غير متوفرة" };
  }
  if (raw === false || raw === 0) {
    return { status: "not_included", labelAr: "غير مشمول" };
  }
  if (typeof raw === "number") {
    if (raw <= 0) return { status: "not_included", labelAr: "غير مشمول" };
    return { status: "included", labelAr: String(raw), count: raw };
  }
  const text = String(raw).trim();
  if (!text) return { status: "unknown", labelAr: "المعلومة غير متوفرة" };
  if (ZERO_WORDS.test(text) || /غير\s*مشمول|not\s*included|none\b/i.test(text)) {
    return { status: "not_included", labelAr: "غير مشمول" };
  }
  const count = Number((text.match(/(\d+)\s*(?:حقيبة|bag)/i) || [])[1]);
  const weight = Number((text.match(/(\d+(?:\.\d+)?)\s*كجم|(\d+(?:\.\d+)?)\s*kg/i) || [])[1]);
  return {
    status: "included",
    labelAr: text,
    count: Number.isFinite(count) && count > 0 ? count : undefined,
    weightKg: Number.isFinite(weight) && weight > 0 ? weight : undefined,
  };
}

export function parseBagAllowance(raw: unknown): FlightBagAllowance {
  const rec = asRecord(raw);
  return {
    personal: inclusionFromProvider(rec.personal ?? rec.personalItem ?? rec.personal_item),
    cabin: inclusionFromProvider(rec.cabin ?? rec.cabinBag ?? rec.carryOn ?? rec.carry_on),
    checked: inclusionFromProvider(rec.checked ?? rec.checkedBag ?? rec.hold),
  };
}

export function analyzeFlightSegment(seg: Record<string, unknown>): FlightSegmentFact {
  const departAt = String(seg.departAt || seg.departTime || "") || undefined;
  const arriveAt = String(seg.arriveAt || seg.arriveTime || "") || undefined;
  const marketingCode = String(
    seg.marketingAirlineCode || seg.airlineCode || seg.airline || "",
  )
    .trim()
    .toUpperCase() || undefined;
  const operatingCode = String(seg.operatingAirlineCode || "").trim().toUpperCase() || undefined;
  const operatingName = String(seg.operatingAirlineName || "").trim() || undefined;
  const codeshare = Boolean(
    operatingCode && marketingCode && operatingCode !== marketingCode,
  );
  const departDate = dateFrom(departAt);
  const arriveDate = dateFrom(arriveAt);
  return {
    from: String(seg.from || "").toUpperCase(),
    to: String(seg.to || "").toUpperCase(),
    departAt,
    arriveAt,
    departClock: clockFrom(departAt),
    arriveClock: clockFrom(arriveAt),
    departDate,
    arriveDate,
    nextDayArrival: Boolean(departDate && arriveDate && arriveDate > departDate),
    marketingAirlineCode: marketingCode,
    marketingAirlineName: String(seg.airline || "").trim() || marketingCode,
    operatingAirlineCode: operatingCode,
    operatingAirlineName: operatingName,
    codeshare,
    flightNumber: String(seg.flightNumber || "").trim() || undefined,
    durationLabel:
      typeof seg.durationMinutes === "number" && seg.durationMinutes > 0
        ? `${Math.floor(seg.durationMinutes / 60)}س ${seg.durationMinutes % 60}د`
        : undefined,
    aircraft: String(seg.aircraft || "").trim() || undefined,
  };
}

function truthyFlag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function analyzeFlightLeg(input: {
  kind: "outbound" | "return";
  from?: string;
  to?: string;
  stops?: number;
  durationLabel?: string;
  segments?: Array<Record<string, unknown>>;
  baggage?: unknown;
  details?: Record<string, unknown>;
}): FlightLegFact {
  const segs = (input.segments || []).map(analyzeFlightSegment);
  const details = asRecord(input.details);
  const policies = asRecord(details.policies);
  let airportChange = false;
  for (let i = 1; i < segs.length; i += 1) {
    if (segs[i - 1]!.to && segs[i]!.from && segs[i - 1]!.to !== segs[i]!.from) {
      airportChange = true;
    }
  }
  const selfConnect = truthyFlag(
    details.selfConnect ?? details.self_connect ?? policies.selfConnect,
  );
  const separateTickets = truthyFlag(
    details.separateTickets ?? details.separate_tickets ?? policies.separateTickets,
  );
  return {
    kind: input.kind,
    titleAr: input.kind === "return" ? "رحلة العودة" : "رحلة الذهاب",
    from: input.from || segs[0]?.from || "",
    to: input.to || segs[segs.length - 1]?.to || "",
    stops: Number(input.stops ?? Math.max(0, segs.length - 1)) || 0,
    durationLabel: input.durationLabel || "—",
    segments: segs,
    airportChange,
    selfConnect,
    separateTickets,
    bags: parseBagAllowance(input.baggage),
  };
}

export function analyzeFarePolicy(details: Record<string, unknown> | null | undefined): FlightFareFact {
  const rec = asRecord(details);
  const policies = asRecord(rec.policies);
  const cabin = String(rec.cabin || rec.cabinClass || "");
  const cabinMap: Record<string, string> = {
    economy: "الاقتصادية",
    premium_economy: "اقتصادية مميزة",
    business: "رجال الأعمال",
    first: "الأولى",
  };
  const changeable = policies.changeable;
  const refundable = policies.refundable;
  const noShow = policies.noShow ?? policies.no_show;
  const benefits: string[] = [];
  if (typeof policies.noteAr === "string" && policies.noteAr.trim()) {
    benefits.push(policies.noteAr.trim());
  }
  return {
    cabinLabelAr: cabinMap[cabin] || (cabin ? cabin : "المعلومة غير متوفرة"),
    brandName:
      typeof rec.selectedFareBrand === "string"
        ? rec.selectedFareBrand
        : typeof rec.fareBrand === "string"
          ? rec.fareBrand
          : undefined,
    benefits,
    change:
      changeable === true
        ? {
            status: "included",
            labelAr:
              policies.changeFeeKwd != null
                ? `يمكن التعديل مقابل ${policies.changeFeeKwd} د.ك`
                : "يمكن التعديل",
          }
        : changeable === false
          ? { status: "not_included", labelAr: "التعديل غير متاح" }
          : { status: "unknown", labelAr: "المعلومة غير متوفرة" },
    cancel:
      refundable === true
        ? {
            status: "included",
            labelAr:
              policies.cancelFeeKwd != null
                ? `يمكن الإلغاء مقابل ${policies.cancelFeeKwd} د.ك`
                : "يمكن الإلغاء",
          }
        : refundable === false
          ? { status: "not_included", labelAr: "غير قابل للإلغاء / الاسترداد" }
          : { status: "unknown", labelAr: "المعلومة غير متوفرة" },
    noShow:
      noShow === false || noShow === "not_allowed"
        ? { status: "not_included", labelAr: "عدم الحضور غير مشمول" }
        : typeof noShow === "string" && noShow
          ? { status: "included", labelAr: noShow }
          : { status: "unknown", labelAr: "المعلومة غير متوفرة" },
  };
}

export function listOfferExtras(
  details: Record<string, unknown> | null | undefined,
  currency = "KWD",
): FlightOfferExtra[] {
  const rec = asRecord(details);
  const raw = rec.availableExtras ?? rec.ancillaries;
  if (!Array.isArray(raw)) return [];
  const extras: FlightOfferExtra[] = [];
  for (const row of raw) {
    const item = asRecord(row);
    const id = String(item.id || "").trim();
    const kind = String(item.kind || "") as FlightExtraKind;
    const amountMinor = Math.round(Number(item.amountMinor));
    if (!id || !["bag", "seat", "meal", "fare_upgrade"].includes(kind)) continue;
    if (!Number.isFinite(amountMinor) || amountMinor < 0) continue;
    extras.push({
      id,
      kind,
      labelAr: String(item.labelAr || item.label || id),
      amountMinor,
      currency: String(item.currency || currency).toUpperCase(),
      ...(typeof item.passengerIndex === "number" ? { passengerIndex: item.passengerIndex } : {}),
      ...(typeof item.segmentKey === "string" ? { segmentKey: item.segmentKey } : {}),
      seatConfirmed: false,
    });
  }
  return extras;
}

export function extrasTotalMinor(extras: Array<{ amountMinor?: number }> | null | undefined): number {
  return (extras || []).reduce((sum, row) => sum + Math.max(0, Math.round(Number(row.amountMinor) || 0)), 0);
}

export function buildFlightPriceBreakdown(input: {
  ticketsMinor: number;
  taxesMinor?: number;
  serviceFeeMinor?: number;
  extrasMinor?: number;
  currency: string;
}): FlightPriceBreakdown {
  const ticketsMinor = Math.max(0, Math.round(input.ticketsMinor || 0));
  const taxesMinor = Math.max(0, Math.round(input.taxesMinor || 0));
  const serviceFeeMinor = Math.max(0, Math.round(input.serviceFeeMinor || 0));
  const extrasMinor = Math.max(0, Math.round(input.extrasMinor || 0));
  return {
    ticketsMinor,
    taxesMinor,
    serviceFeeMinor,
    extrasMinor,
    totalMinor: ticketsMinor + taxesMinor + serviceFeeMinor + extrasMinor,
    currency: (input.currency || "KWD").toUpperCase(),
  };
}

/** Split a sell total into ticket + tax lines only when the offer provides them. */
export function splitOfferSell(details: Record<string, unknown> | null | undefined, sellMinor: number) {
  const rec = asRecord(details);
  const taxes = Number(rec.taxesAmountMinor ?? rec.taxAmountMinor);
  const base = Number(rec.baseAmountMinor ?? rec.ticketAmountMinor);
  if (Number.isFinite(taxes) && taxes >= 0 && Number.isFinite(base) && base >= 0) {
    return { ticketsMinor: Math.round(base), taxesMinor: Math.round(taxes) };
  }
  return { ticketsMinor: Math.round(sellMinor), taxesMinor: 0 };
}

export function isRecentValidation(validatedAt?: string | null, windowMs = 20 * 60 * 1000): boolean {
  if (!validatedAt) return false;
  const ms = Date.parse(validatedAt);
  return Number.isFinite(ms) && Date.now() - ms >= 0 && Date.now() - ms < windowMs;
}

export function holdTimerFromOffer(raw: Record<string, unknown> | null | undefined): {
  show: boolean;
  expiresAt?: string;
} {
  const rec = asRecord(raw);
  const guaranteed = rec.holdGuaranteed === true || rec.guaranteedHold === true;
  const expiresAt = String(rec.holdExpiresAt || rec.guaranteedHoldUntil || "").trim();
  if (!guaranteed || !expiresAt) return { show: false };
  return { show: true, expiresAt };
}

const LATIN_NAME = /^[A-Za-z][A-Za-z .'-]{0,58}$/;

export function isLatinTravelName(value: string): boolean {
  return LATIN_NAME.test(value.trim());
}

export function ageOnDate(birthDate: string, onDate: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !/^\d{4}-\d{2}-\d{2}$/.test(onDate)) {
    return null;
  }
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = onDate.split("-").map(Number);
  let age = ty! - by!;
  if (tm! < bm! || (tm === bm && td! < bd!)) age -= 1;
  return age;
}

export function classifyTravelerAge(age: number): FlightTravelerType {
  if (age < 2) return "infant";
  if (age < 12) return "child";
  return "adult";
}

export function validateFlightTraveler(
  traveler: FlightTravelerInput,
  travelDate: string,
  requirePassport: boolean,
): FlightFieldErrors {
  const errors: FlightFieldErrors = {};
  if (!traveler.firstName.trim()) errors.firstName = "أدخل الاسم الأول بالإنجليزية";
  else if (!isLatinTravelName(traveler.firstName)) {
    errors.firstName = "الاسم بالإنجليزية كما في وثيقة السفر";
  }
  if (!traveler.lastName.trim()) errors.lastName = "أدخل اسم العائلة بالإنجليزية";
  else if (!isLatinTravelName(traveler.lastName)) {
    errors.lastName = "اسم العائلة بالإنجليزية كما في وثيقة السفر";
  }
  if (traveler.middleName?.trim() && !isLatinTravelName(traveler.middleName)) {
    errors.firstName = errors.firstName || "الاسم الأوسط بالإنجليزية كما في وثيقة السفر";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(traveler.birthDate)) {
    errors.birthDate = "أدخل تاريخ ميلاد صحيحًا";
  } else {
    const age = ageOnDate(traveler.birthDate, travelDate);
    if (age == null || age < 0 || age > 120) {
      errors.birthDate = "تاريخ الميلاد غير صالح";
    } else if (classifyTravelerAge(age) !== traveler.type) {
      const expected = classifyTravelerAge(age);
      const labels = { adult: "بالغ", child: "طفل", infant: "رضيع" };
      errors.birthDate = `العمر عند السفر يناسب فئة ${labels[expected]} وليس ${labels[traveler.type]}`;
      errors.type = errors.birthDate;
    }
  }
  if (!traveler.gender) errors.gender = "اختر الجنس";
  if (requirePassport) {
    if (!traveler.nationality?.trim()) errors.nationality = "أدخل الجنسية";
    if (!traveler.passportNumber?.trim()) errors.passportNumber = "رقم الجواز مطلوب لهذه الرحلة";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(traveler.passportIssueDate || "")) {
      errors.passportIssueDate = "تاريخ إصدار الجواز مطلوب";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(traveler.passportExpiry || "")) {
      errors.passportExpiry = "تاريخ انتهاء الجواز مطلوب";
    } else if (travelDate && traveler.passportExpiry && traveler.passportExpiry < travelDate) {
      errors.passportExpiry = "الجواز منتهٍ في تاريخ السفر";
    }
  }
  return errors;
}

export function validateFlightContact(input: {
  name: string;
  email: string;
  phone?: string;
}): FlightFieldErrors {
  const errors: FlightFieldErrors = {};
  if (!input.name.trim()) errors.contactName = "أدخل اسم التواصل";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = "أدخل بريدًا إلكترونيًا صحيحًا";
  }
  const phone = String(input.phone || "").replace(/\s+/g, "");
  if (phone && !/^\+?\d{8,15}$/.test(phone)) {
    errors.phone = "رقم الجوال غير صالح";
  }
  return errors;
}

export function passportRequiredForOffer(details: Record<string, unknown> | null | undefined): boolean {
  const rec = asRecord(details);
  if (rec.requiresPassport === false) return false;
  if (rec.requiresPassport === true || rec.documentRequired === true) return true;
  return true;
}

export function deriveFlightShopLifecycle(input: {
  paymentStatus?: string;
  bookingStatus?: string;
  shopLifecycle?: string;
  issuedAt?: string | null;
  providerRef?: string | null;
  tickets?: Array<{ ticketNumber?: string }> | null;
}): FlightShopLifecycle {
  if (input.shopLifecycle && input.shopLifecycle in FLIGHT_SHOP_LIFECYCLE_AR) {
    const forced = input.shopLifecycle as FlightShopLifecycle;
    if (forced === "ticketed") {
      const hasTickets = Boolean(
        input.tickets?.some((t) => t.ticketNumber?.trim()) ||
          (input.issuedAt && input.providerRef),
      );
      if (!hasTickets) return "needs_followup";
    }
    return forced;
  }
  const pay = String(input.paymentStatus || "").toLowerCase();
  const book = String(input.bookingStatus || "").toLowerCase();
  const hasTickets = Boolean(
    input.tickets?.some((t) => t.ticketNumber?.trim()) ||
      (book === "ticketed" && input.providerRef),
  );
  if (hasTickets && (book === "ticketed" || book === "confirmed")) return "ticketed";
  if (book === "failed" && pay !== "paid") return "failed";
  if (pay === "paid" && book !== "ticketed") return "needs_followup";
  if (pay === "failed") return "failed";
  if (pay === "pending" || pay === "unpaid") return "paying";
  if (book === "on_hold") return "booking";
  return "checking";
}

export function newShopIdempotencyKey(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `wg-flight-${Date.now().toString(36)}-${rand}`;
}

export function weekendgateRefFromId(id: string): string {
  return `WG-${id.replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}
