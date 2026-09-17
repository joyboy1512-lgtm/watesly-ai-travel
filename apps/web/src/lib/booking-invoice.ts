import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { formatMoneyMinor } from "@/lib/format";

export type BookingInvoicePayment = {
  id?: string;
  status: string;
  method?: string;
  amount: number;
  currency?: string;
  reference?: string | null;
  createdAt?: string;
};

export type BookingInvoiceItem = {
  id?: string;
  serviceType: string;
  description: string;
  sellAmount?: number;
  costAmount?: number;
  profitAmount?: number;
};

export type BookingInvoiceData = {
  id: string;
  status: string;
  providerBookingRef?: string | null;
  totalSellAmount: number;
  totalCostAmount?: number;
  totalProfitAmount?: number;
  createdAt: string;
  issuedAt?: string | null;
  passengerDetails?: {
    contact?: { email?: string; phone?: string };
    serviceType?: string;
    description?: string;
    ticketType?: string;
    seatPref?: string;
    extras?: Record<string, unknown>;
    travelers?: Array<{ firstName?: string; lastName?: string }>;
    guests?: Array<{ firstName?: string; lastName?: string }>;
    route?: {
      origin?: string;
      destination?: string;
      originLabel?: string;
      destinationLabel?: string;
      departDate?: string;
      returnDate?: string;
      cabinClass?: string;
    };
    stay?: {
      location?: string;
      locationLabel?: string;
      checkIn?: string;
      checkOut?: string;
      rooms?: number;
    };
  } | null;
  quote?: {
    currency?: string;
    contact?: { name?: string | null; waId?: string; email?: string | null } | null;
    inquiry?: {
      origin?: string | null;
      destination?: string | null;
      departDate?: string | null;
      returnDate?: string | null;
    } | null;
    items?: BookingInvoiceItem[];
  } | null;
  payments?: BookingInvoicePayment[];
};

export type PrintBookingOptions = {
  includeCost?: boolean;
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  on_hold: "معلّق / بانتظار",
  issued: "مُصدَر",
  completed: "مكتمل",
  cancelled: "ملغى",
  confirmed: "مؤكد",
};

export const BOOKING_STATUS_LABEL_EN: Record<string, string> = {
  draft: "Draft",
  on_hold: "On hold",
  issued: "Issued",
  completed: "Completed",
  cancelled: "Cancelled",
  confirmed: "Confirmed",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  refunded: "مسترد",
  failed: "فشل",
};

export const PAYMENT_STATUS_LABEL_EN: Record<string, string> = {
  paid: "PAID",
  unpaid: "UNPAID",
  pending: "PENDING",
  refunded: "REFUNDED",
  failed: "FAILED",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  manual: "يدوي",
  cash: "نقدًا",
  card: "بطاقة ائتمانية",
  transfer: "تحويل بنكي",
  knet: "كي نت",
  online: "إلكتروني",
  credit: "بطاقة ائتمانية",
};

export const PAYMENT_METHOD_LABEL_EN: Record<string, string> = {
  manual: "Manual",
  cash: "Cash",
  card: "Credit Card",
  transfer: "Bank transfer",
  knet: "KNET",
  online: "Online",
  credit: "Credit Card",
};

const CABIN_AR: Record<string, string> = {
  economy: "سياحية",
  premium_economy: "سياحية مميزة",
  business: "رجال الأعمال",
  first: "أولى",
};

const CABIN_EN: Record<string, string> = {
  economy: "Economy",
  premium_economy: "Premium Economy",
  business: "Business",
  first: "First",
};

const SERVICE_AR: Record<string, string> = {
  flight: "طيران",
  hotel: "فندق",
  transfer: "نقل",
  activity: "نشاط",
  travel: "سفر",
};

const SERVICE_EN: Record<string, string> = {
  flight: "Flight",
  hotel: "Hotel",
  transfer: "Transfer",
  activity: "Activity",
  travel: "Travel",
};

export function dayKey(value?: string | Date | null): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDay(value?: string | Date | null) {
  const key = dayKey(value);
  if (!key) return "—";
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

export function formatPrintDate(value?: string | Date | null) {
  const key = dayKey(value);
  if (!key) return "—";
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function customerName(row: BookingInvoiceData) {
  const t = row.passengerDetails?.travelers?.[0] || row.passengerDetails?.guests?.[0];
  if (t?.firstName || t?.lastName) {
    return [t.firstName, t.lastName].filter(Boolean).join(" ");
  }
  return row.quote?.contact?.name || "—";
}

export function bookingOrigin(row: BookingInvoiceData) {
  return (
    row.passengerDetails?.route?.originLabel ||
    row.passengerDetails?.route?.origin ||
    row.quote?.inquiry?.origin ||
    ""
  );
}

export function bookingDestination(row: BookingInvoiceData) {
  return (
    row.passengerDetails?.route?.destinationLabel ||
    row.passengerDetails?.route?.destination ||
    row.quote?.inquiry?.destination ||
    row.passengerDetails?.stay?.locationLabel ||
    row.passengerDetails?.stay?.location ||
    ""
  );
}

export function routeLabel(row: BookingInvoiceData) {
  const origin = bookingOrigin(row);
  const dest = bookingDestination(row);
  if (origin && dest) return `${origin} → ${dest}`;
  return dest || origin || row.quote?.items?.[0]?.description || "—";
}

export function bookingTravelDate(row: BookingInvoiceData) {
  return (
    row.passengerDetails?.route?.departDate ||
    row.passengerDetails?.stay?.checkIn ||
    row.quote?.inquiry?.departDate ||
    null
  );
}

export function bookingReturnDate(row: BookingInvoiceData) {
  return (
    row.passengerDetails?.route?.returnDate ||
    row.passengerDetails?.stay?.checkOut ||
    row.quote?.inquiry?.returnDate ||
    null
  );
}

export function paidAmount(row: BookingInvoiceData) {
  return (row.payments || [])
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

export function bookingHasCost(row: BookingInvoiceData) {
  return (
    row.totalCostAmount != null ||
    (row.quote?.items || []).some((item) => item.costAmount != null)
  );
}

function esc(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function nightsBetween(from?: string | null, to?: string | null) {
  const a = dayKey(from);
  const b = dayKey(to);
  if (!a || !b) return 0;
  const ms = new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function cabinPair(raw?: string | null) {
  const key = (raw || "economy").toLowerCase().replace(/\s+/g, "_");
  return {
    ar: CABIN_AR[key] || raw || "سياحية",
    en: CABIN_EN[key] || raw || "Economy",
  };
}

function servicePair(raw?: string | null) {
  const key = (raw || "travel").toLowerCase();
  return {
    ar: SERVICE_AR[key] || raw || "خدمة",
    en: SERVICE_EN[key] || raw || "Service",
  };
}

function kv(ar: string, en: string, value: string) {
  return `<div class="kv">
    <span class="lab"><b>${esc(ar)}</b> <em>${esc(en)}</em></span>
    <strong>${value}</strong>
  </div>`;
}

function sectionTitle(ar: string, en: string) {
  return `<h3><span>${esc(ar)}</span><i>${esc(en)}</i></h3>`;
}

function itemsOf(row: BookingInvoiceData, type: string) {
  return (row.quote?.items || []).filter((item) => item.serviceType === type);
}

function extra(row: BookingInvoiceData, key: string): string {
  const extras = row.passengerDetails?.extras || {};
  const nested =
    extras.details && typeof extras.details === "object"
      ? (extras.details as Record<string, unknown>)
      : extras;
  return str(nested[key] || extras[key]);
}

function logoUrl() {
  if (typeof window === "undefined") return "https://www.weekendgate.com/brand/wg-lockup-dark.png";
  try {
    return `${window.location.origin}/brand/wg-lockup-dark.png`;
  } catch {
    return "https://www.weekendgate.com/brand/wg-lockup-dark.png";
  }
}

function itineraryHtml(row: BookingInvoiceData, orgName: string) {
  const currency = row.quote?.currency || "KWD";
  const paid = paidAmount(row);
  const remaining = Math.max(0, (row.totalSellAmount || 0) - paid);
  const travelers = [
    ...(row.passengerDetails?.travelers || []),
    ...(row.passengerDetails?.guests || []),
  ];
  const phone =
    row.passengerDetails?.contact?.phone || row.quote?.contact?.waId || "—";
  const email =
    row.passengerDetails?.contact?.email || row.quote?.contact?.email || "—";
  const pnr = row.providerBookingRef || row.id.slice(0, 8).toUpperCase();
  const ticketNo = extra(row, "ticketNumber") || extra(row, "ticketNo") || "—";
  const serviceType =
    row.passengerDetails?.serviceType || row.quote?.items?.[0]?.serviceType || "";
  const flights = itemsOf(row, "flight");
  const hotels = itemsOf(row, "hotel");
  const transfers = itemsOf(row, "transfer");
  const activities = itemsOf(row, "activity");
  const hasFlight = Boolean(row.passengerDetails?.route) || flights.length > 0;
  const hasHotel = Boolean(row.passengerDetails?.stay) || hotels.length > 0;
  const cabin = cabinPair(row.passengerDetails?.route?.cabinClass);
  const origin = bookingOrigin(row) || "—";
  const dest = bookingDestination(row) || "—";
  const nights = nightsBetween(
    row.passengerDetails?.stay?.checkIn || bookingTravelDate(row),
    row.passengerDetails?.stay?.checkOut || bookingReturnDate(row),
  );
  const hotelName =
    extra(row, "hotelName") ||
    extra(row, "name") ||
    row.passengerDetails?.stay?.locationLabel ||
    hotels[0]?.description ||
    dest;
  const roomName =
    extra(row, "roomName") || extra(row, "room") || extra(row, "roomOption") || "—";
  const boardName =
    extra(row, "boardName") || extra(row, "board") || extra(row, "mealPlan") || "—";
  const confirmNo =
    extra(row, "confirmationNo") ||
    extra(row, "confirmation") ||
    row.providerBookingRef ||
    "—";
  const guestCount = travelers.length || 1;
  const paidPayment = (row.payments || []).filter((p) => p.status === "paid").at(-1);
  const payStatus = paidPayment
    ? "paid"
    : remaining <= 0 && row.totalSellAmount
      ? "paid"
      : (row.payments || [])[0]?.status || "unpaid";
  const payMethod = paidPayment?.method || (row.payments || [])[0]?.method || "—";
  const payRef = paidPayment?.reference || pnr;
  const payDate = paidPayment?.createdAt || row.issuedAt || row.createdAt;
  const items = row.quote?.items?.length
    ? row.quote.items
    : [
        {
          serviceType: serviceType || "travel",
          description: routeLabel(row),
          sellAmount: row.totalSellAmount,
          costAmount: row.totalCostAmount,
          profitAmount: row.totalProfitAmount,
        },
      ];

  const travelerNames = travelers.length
    ? travelers
        .map((t) => [t.firstName, t.lastName].filter(Boolean).join(" ") || "—")
        .join(" · ")
    : customerName(row);

  const fareRows = items
    .map((item) => {
      const svc = servicePair(item.serviceType);
      return `<tr>
        <td>${esc(svc.ar)} <i>${esc(svc.en)}</i></td>
        <td>${esc(item.description)}</td>
        <td class="ltr">${esc(formatMoneyMinor(item.sellAmount ?? 0, currency))}</td>
      </tr>`;
    })
    .join("");

  const costRows = items
    .map((item) => {
      const svc = servicePair(item.serviceType);
      return `<tr>
        <td>${esc(svc.ar)} <i>${esc(svc.en)}</i></td>
        <td>${esc(item.description)}</td>
        <td class="ltr">${esc(formatMoneyMinor(item.costAmount ?? 0, currency))}</td>
        <td class="ltr">${esc(formatMoneyMinor(item.sellAmount ?? 0, currency))}</td>
        <td class="ltr">${esc(formatMoneyMinor(item.profitAmount ?? 0, currency))}</td>
      </tr>`;
    })
    .join("");

  const flightBlock = hasFlight
    ? `<section class="box">
        ${sectionTitle("خط سير الرحلة", "FLIGHT ITINERARY")}
        <div class="grid-2">
          ${kv("شركة الطيران", "Airline", esc(extra(row, "airline") || extra(row, "airlineName") || "—"))}
          ${kv("رقم الرحلة", "Flight", esc(extra(row, "flightNumber") || extra(row, "flight") || "—"))}
          ${kv("المغادرة", "Departure", `${esc(origin)}<small class="ltr">${esc(formatPrintDate(bookingTravelDate(row)))}</small>`)}
          ${kv("الوصول", "Arrival", `${esc(dest)}${bookingReturnDate(row) ? `<small class="ltr">${esc(formatPrintDate(bookingReturnDate(row)))}</small>` : ""}`)}
          ${kv("الدرجة", "Class", `${esc(cabin.ar)} <i>| ${esc(cabin.en)}</i>`)}
          ${kv("الأمتعة", "Baggage", esc(extra(row, "baggage") || extra(row, "bags") || "—"))}
          ${kv("الحالة", "Status", `${esc(BOOKING_STATUS_LABEL[row.status] || row.status)} <i>| ${esc(BOOKING_STATUS_LABEL_EN[row.status] || row.status)}</i>`)}
          ${kv("المدة", "Duration", esc(extra(row, "duration") || "—"))}
        </div>
      </section>`
    : "";

  const hotelBlock = hasHotel
    ? `<section class="box">
        ${sectionTitle("حجز الفندق", "HOTEL RESERVATION")}
        <div class="grid-2">
          ${kv("الفندق", "Hotel", esc(hotelName))}
          ${kv("رقم التأكيد", "Confirmation No.", esc(confirmNo))}
          ${kv("تسجيل الدخول", "Check-in", `<span class="ltr">${esc(formatPrintDate(row.passengerDetails?.stay?.checkIn || bookingTravelDate(row)))}</span>`)}
          ${kv("تسجيل المغادرة", "Check-out", `<span class="ltr">${esc(formatPrintDate(row.passengerDetails?.stay?.checkOut || bookingReturnDate(row)))}</span>`)}
          ${kv("عدد الليالي", "Nights", nights ? `${nights} ${nights === 1 ? "ليلة" : "ليالٍ"} <i>| ${nights} Night${nights === 1 ? "" : "s"}</i>` : "—")}
          ${kv("الغرفة", "Room", esc(roomName))}
          ${kv("الوجبات", "Meal Plan", esc(boardName))}
          ${kv("النزلاء", "Guests", `${guestCount} ${guestCount === 1 ? "بالغ" : "نزلاء"} <i>| ${guestCount} guest${guestCount === 1 ? "" : "s"}</i>`)}
        </div>
      </section>`
    : "";

  const otherBlocks = [...transfers, ...activities]
    .map((item) => {
      const svc = servicePair(item.serviceType);
      return `<section class="box">
        ${sectionTitle(svc.ar, svc.en.toUpperCase())}
        <p class="desc">${esc(item.description)}</p>
        <p class="ltr amount">${esc(formatMoneyMinor(item.sellAmount ?? 0, currency))}</p>
      </section>`;
    })
    .join("");

  return `<article class="doc">
    <header class="mast">
      <div class="brand-wrap">
        <img src="${esc(logoUrl())}" alt="WeekendGate" class="logo" />
        <div>
          <div class="brand">${esc(COMPANY_LEGAL.brandName)}</div>
          <div class="legal">${esc(COMPANY_LEGAL.legalNameAr)} · ${esc(COMPANY_LEGAL.legalNameEn)}</div>
        </div>
      </div>
      <div class="doc-title">
        <strong>TRAVEL ITINERARY &amp; HOTEL CONFIRMATION</strong>
        <span>خط سير الرحلة وتأكيد حجز الفندق</span>
      </div>
    </header>

    <section class="box">
      ${sectionTitle("بيانات المسافر", "PASSENGER DETAILS")}
      <div class="grid-2">
        ${kv("اسم المسافر", "Passenger Name", esc(travelerNames))}
        ${kv("مرجع الحجز", "Booking Reference (PNR)", `<span class="ltr">${esc(pnr)}</span>`)}
        ${kv("رقم التذكرة", "Ticket Number", `<span class="ltr">${esc(ticketNo)}</span>`)}
        ${kv("الهاتف", "Phone", `<span class="ltr">${esc(phone)}</span>`)}
        ${kv("البريد", "Email", `<span class="ltr">${esc(email)}</span>`)}
        ${kv("تاريخ الحجز", "Booking Date", `<span class="ltr">${esc(formatPrintDate(row.createdAt))}</span>`)}
      </div>
    </section>

    ${flightBlock}
    ${hotelBlock}
    ${otherBlocks}

    <section class="box">
      ${sectionTitle("الأسعار والدفع", "FARE & PAYMENT")}
      <table>
        <thead>
          <tr>
            <th>الخدمة <i>Service</i></th>
            <th>الوصف <i>Description</i></th>
            <th>المبلغ <i>Amount</i></th>
          </tr>
        </thead>
        <tbody>${fareRows}</tbody>
      </table>
      <div class="totals">
        <div><span>الإجمالي <i>TOTAL AMOUNT</i></span><strong class="ltr">${esc(formatMoneyMinor(row.totalSellAmount, currency))}</strong></div>
        <div><span>المدفوع <i>Paid</i></span><strong class="ltr">${esc(formatMoneyMinor(paid, currency))}</strong></div>
        <div class="remain"><span>المتبقي <i>Balance</i></span><strong class="ltr">${esc(formatMoneyMinor(remaining, currency))}</strong></div>
      </div>
    </section>

    <section class="box cost-block">
      ${sectionTitle("تكلفة الوكالة", "AGENCY COST")}
      <p class="cost-note">هذا القسم داخلي ولا يُطبع للعميل إلا عند تفعيل إظهار التكلفة.</p>
      <table>
        <thead>
          <tr>
            <th>الخدمة <i>Service</i></th>
            <th>الوصف <i>Description</i></th>
            <th>التكلفة <i>Cost</i></th>
            <th>البيع <i>Sell</i></th>
            <th>الربح <i>Profit</i></th>
          </tr>
        </thead>
        <tbody>${costRows}</tbody>
      </table>
      <div class="totals cost">
        <div><span>تكلفة المورد <i>Supplier cost</i></span><strong class="ltr">${esc(formatMoneyMinor(row.totalCostAmount || 0, currency))}</strong></div>
        <div><span>سعر البيع <i>Sell</i></span><strong class="ltr">${esc(formatMoneyMinor(row.totalSellAmount, currency))}</strong></div>
        <div class="remain"><span>هامش الربح <i>Profit</i></span><strong class="ltr">${esc(formatMoneyMinor(row.totalProfitAmount || 0, currency))}</strong></div>
      </div>
    </section>

    <section class="pay-page">
      ${sectionTitle("تأكيد الدفع", "PAYMENT CONFIRMATION")}
      <div class="pay-ref ltr">${esc(payRef)}</div>
      <div class="grid-2">
        ${kv("حالة الدفع", "Payment Status", `${esc(PAYMENT_STATUS_LABEL[payStatus] || payStatus)} <i>| ${esc(PAYMENT_STATUS_LABEL_EN[payStatus] || payStatus)}</i>`)}
        ${kv("طريقة الدفع", "Payment Method", `${esc(PAYMENT_METHOD_LABEL[payMethod] || payMethod)} <i>| ${esc(PAYMENT_METHOD_LABEL_EN[payMethod] || payMethod)}</i>`)}
        ${kv("تاريخ الدفع", "Payment Date", `<span class="ltr">${esc(formatPrintDate(payDate))}</span>`)}
        ${kv("الوكالة", "Agency", `${esc(orgName || COMPANY_LEGAL.brandName)}`)}
      </div>
      <p class="contact">
        <span class="ltr">${esc(COMPANY_LEGAL.phoneE164)}</span>
        · <span class="ltr">${esc(COMPANY_LEGAL.supportEmail)}</span>
        · ${esc(COMPANY_LEGAL.addressAr)}
      </p>
      <p class="disclaimer">
        هذا المستند تأكيد حجز صادر عن ${esc(COMPANY_LEGAL.legalNameAr)}. الحجوزات تُنفَّذ عبر مزوّدي طيران وفنادق معتمدين، وقد تُدفع بعض الضرائب والرسوم في مكان الإقامة حسب سياسة الفندق.
        <span lang="en" dir="ltr">${esc(COMPANY_LEGAL.roleClarificationEn)}</span>
      </p>
    </section>
  </article>`;
}

const PRINT_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap");
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  font-family: Cairo, "Segoe UI", Tahoma, sans-serif;
  color: #0f3340;
  background: #e8eceb;
  direction: rtl;
}
.ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; text-align: start; }
.toolbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; gap: 12px; align-items: center; justify-content: center;
  padding: 10px 16px;
  background: #0f3340; color: #fff;
  font-weight: 700;
}
.toolbar label { display: flex; gap: 8px; align-items: center; cursor: pointer; }
.toolbar button {
  border: 0; background: #d8a35e; color: #0f3340;
  font: inherit; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer;
}
.doc {
  max-width: 820px; margin: 16px auto; background: #fff;
  border: 1px solid #d5dfdc; padding: 18px 20px 24px;
  box-shadow: 0 10px 28px rgba(15,51,64,.08);
}
.mast {
  display: flex; justify-content: space-between; gap: 16px; align-items: center;
  border-bottom: 4px solid #d8a35e; padding-bottom: 12px; margin-bottom: 14px;
}
.brand-wrap { display: flex; gap: 10px; align-items: center; }
.logo { height: 42px; width: auto; }
.brand { font-size: 22px; font-weight: 800; color: #0f3340; }
.legal { font-size: 12px; color: #5f7470; margin-top: 2px; }
.doc-title { text-align: left; }
.doc-title strong { display: block; font-size: 13px; letter-spacing: .04em; color: #0f3340; }
.doc-title span { display: block; font-size: 18px; font-weight: 800; color: #184a52; }
.box { border: 1px solid #d7e2de; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
h3 { margin: 0 0 10px; display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
  font-size: 15px; color: #0f3340; border-bottom: 1px solid #edf2f0; padding-bottom: 6px; }
h3 i { font-style: normal; font-size: 11px; letter-spacing: .04em; color: #7a8b86; font-weight: 800; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; }
.kv { display: grid; gap: 2px; }
.lab { color: #5f7470; font-size: 11px; font-weight: 700; }
.lab em { font-style: normal; color: #8a9b97; font-weight: 600; }
.kv strong { font-size: 14px; color: #0f3340; }
.kv small { display: block; color: #5f7470; font-weight: 600; font-size: 12px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { border: 1px solid #d7e4df; padding: 7px 8px; text-align: start; }
th { background: #0f3340; color: #f3f7f4; font-weight: 700; }
th i, td i { font-style: normal; opacity: .75; font-weight: 600; font-size: 11px; }
.totals { margin-top: 10px; display: grid; gap: 6px; max-width: 340px; margin-inline-start: auto; }
.totals div { display: flex; justify-content: space-between; gap: 12px; padding: 7px 10px; background: #f4f7f6; }
.totals .remain { background: #f7ecda; }
.totals i { font-style: normal; color: #7a8b86; font-size: 11px; }
.pay-page { page-break-before: always; padding-top: 8px; }
.pay-ref {
  font-size: 22px; font-weight: 800; letter-spacing: .08em;
  background: #0f3340; color: #fff; padding: 10px 14px; border-radius: 8px; margin: 0 0 12px;
  text-align: center;
}
.contact { margin: 12px 0 8px; color: #184a52; font-weight: 700; font-size: 13px; }
.disclaimer { font-size: 11px; color: #5f7470; line-height: 1.7; margin: 0; }
.disclaimer span { display: block; margin-top: 6px; }
.desc { margin: 0 0 6px; }
.amount { margin: 0; font-weight: 800; }
.cost-note { margin: 0 0 8px; color: #7a4a10; font-size: 12px; font-weight: 700; }
.cost-block { display: none; border-color: #d8a35e; background: #fffaf2; }
body.show-cost .cost-block { display: block; }
@page { size: A4; margin: 10mm; }
@media print {
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .toolbar { display: none !important; }
  .doc { margin: 0; max-width: none; box-shadow: none; border: 0; padding: 0; }
}
@media (max-width: 700px) { .grid-2, .mast { grid-template-columns: 1fr; display: grid; } }
`;

export function printBookingInvoices(
  rows: BookingInvoiceData[],
  orgName = "WeekendGate",
  options: PrintBookingOptions = {},
) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;
  const canToggleCost = rows.some(bookingHasCost);
  const startWithCost = Boolean(options.includeCost && canToggleCost);
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>خط سير الرحلة وتأكيد الحجز</title>
  <style>${PRINT_CSS}</style>
</head>
<body class="${startWithCost ? "show-cost" : ""}">
  <div class="toolbar">
    ${
      canToggleCost
        ? `<label><input type="checkbox" id="costToggle"${startWithCost ? " checked" : ""} /> إظهار التكلفة / Show cost</label>`
        : ""
    }
    <button type="button" id="printBtn">طباعة التقرير والفاتورة</button>
  </div>
${rows.map((row) => itineraryHtml(row, orgName)).join("\n")}
  <script>
    (function () {
      var box = document.getElementById("costToggle");
      if (box) {
        box.addEventListener("change", function () {
          document.body.classList.toggle("show-cost", box.checked);
        });
      }
      document.getElementById("printBtn").addEventListener("click", function () { window.print(); });
      setTimeout(function () { window.print(); }, 400);
    })();
  </script>
</body>
</html>`;

  const popup = window.open("", "_blank", "width=920,height=1100");
  if (!popup) {
    throw new Error("اسمح بالنوافذ المنبثقة لطباعة التقرير والفاتورة");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
}
