import { COMPANY_LEGAL, formatMoneyMinorShared } from "@watesly-travel/shared";
import {
  bookedQuoteItems,
  bookingHasCost,
  bookingLocator,
  dash,
  extra,
  extraValue,
  hotelConfirmation,
  invoiceCostTotals,
  invoiceSaleLines,
  invoiceSellTotal,
  ticketNumbers,
  type BookingInvoiceData,
  type BookingInvoiceItem,
  type BookingInvoicePayment,
} from "./booking-invoice-lines";

export type {
  BookingInvoiceData,
  BookingInvoiceItem,
  BookingInvoicePayment,
};
export { bookingHasCost };

export type PrintBookingOptions = {
  includeCost?: boolean;
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  on_hold: "معلّق / بانتظار",
  issued: "مُصدَر",
  completed: "مكتمل",
  cancelled: "ملغى",
  canceled: "ملغى",
  confirmed: "مؤكد",
  ticketed: "مُصدَر",
  failed: "فشل",
};

export const BOOKING_STATUS_LABEL_EN: Record<string, string> = {
  draft: "Draft",
  on_hold: "On hold",
  issued: "Issued",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  confirmed: "Confirmed",
  ticketed: "Ticketed",
  failed: "Failed",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  refunded: "مسترد",
  failed: "فشل",
  partial: "جزئي",
};

export const PAYMENT_STATUS_LABEL_EN: Record<string, string> = {
  paid: "PAID",
  unpaid: "UNPAID",
  pending: "PENDING",
  refunded: "REFUNDED",
  failed: "FAILED",
  partial: "PARTIAL",
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

function positiveInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function bookingCurrency(row: BookingInvoiceData) {
  return (row.quote?.currency || "KWD").toUpperCase();
}

export function bookingTravelerCount(row: BookingInvoiceData) {
  const named = [
    ...(row.passengerDetails?.travelers || []),
    ...(row.passengerDetails?.guests || []),
  ].length;
  if (named > 0) return named;

  const details = row.passengerDetails as
    | (NonNullable<BookingInvoiceData["passengerDetails"]> & {
        adults?: number;
        children?: number;
        infants?: number;
      })
    | null
    | undefined;
  const fromDetails =
    positiveInt(details?.adults) +
    positiveInt(details?.children) +
    positiveInt(details?.infants);
  if (fromDetails > 0) return fromDetails;

  const fromParty =
    positiveInt(extraValue(row, "adults")) +
    positiveInt(extraValue(row, "children")) +
    positiveInt(extraValue(row, "infants"));
  if (fromParty > 0) return fromParty;

  const fromCount =
    positiveInt(extraValue(row, "pax")) ||
    positiveInt(extraValue(row, "guestCount")) ||
    positiveInt(extraValue(row, "travelers"));
  if (fromCount > 0) return fromCount;

  const inquiry = row.quote?.inquiry;
  const fromInquiry =
    positiveInt(inquiry?.adults) +
    positiveInt(inquiry?.children) +
    positiveInt(inquiry?.infants);
  if (fromInquiry > 0) return fromInquiry;

  return 1;
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
  return dest || origin || bookedQuoteItems(row)[0]?.description || "—";
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

function esc(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function money(amount: number, currency: string) {
  return `<span class="ltr num">${esc(formatMoneyMinorShared(amount, currency))}</span>`;
}

function kv(ar: string, en: string, value: string) {
  return `<div class="kv">
    <span class="lab"><b>${esc(ar)}</b><em class="ltr">${esc(en)}</em></span>
    <strong>${value}</strong>
  </div>`;
}

function sectionTitle(ar: string, en: string) {
  return `<h3><span>${esc(ar)}</span><i class="ltr">${esc(en)}</i></h3>`;
}

function refCell(ar: string, en: string, value: string, isolateLtr = true) {
  return `<div>
    <span><b>${esc(ar)}</b><i class="ltr">${esc(en)}</i></span>
    <strong class="${isolateLtr ? "ltr" : ""}">${value}</strong>
  </div>`;
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
  const sellTotal = invoiceSellTotal(row);
  const remaining = Math.max(0, sellTotal - paid);
  const costTotals = invoiceCostTotals(row);
  const lines = invoiceSaleLines(row);
  const travelers = [
    ...(row.passengerDetails?.travelers || []),
    ...(row.passengerDetails?.guests || []),
  ];
  const phone =
    row.passengerDetails?.contact?.phone || row.quote?.contact?.waId || "—";
  const email =
    row.passengerDetails?.contact?.email || row.quote?.contact?.email || "—";
  const locator = bookingLocator(row);
  const tickets = ticketNumbers(row);
  const confirm = hotelConfirmation(row);
  const hasFlight = lines.some((line) => line.kind === "flight") || Boolean(row.passengerDetails?.route);
  const hasHotel = lines.some((line) => line.kind === "hotel") || Boolean(row.passengerDetails?.stay);
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
    lines.find((line) => line.kind === "hotel")?.description ||
    dest;
  const roomName =
    extra(row, "roomName") || extra(row, "room") || extra(row, "roomOption") || "—";
  const boardName =
    extra(row, "boardName") || extra(row, "board") || extra(row, "mealPlan") || "—";
  const guestCount = travelers.length || 1;
  const paidPayment = (row.payments || []).filter((p) => p.status === "paid").at(-1);
  const payStatus = paidPayment
    ? "paid"
    : remaining <= 0 && sellTotal
      ? "paid"
      : (row.payments || [])[0]?.status || "unpaid";
  const payMethod = paidPayment?.method || (row.payments || [])[0]?.method || "—";
  const payRef = paidPayment?.reference || locator;
  const payDate = paidPayment?.createdAt || row.issuedAt || row.createdAt;

  const travelerNames = travelers.length
    ? travelers
        .map((t) => [t.firstName, t.lastName].filter(Boolean).join(" ") || "—")
        .join(" · ")
    : customerName(row);

  const ticketDisplay = tickets.length
    ? tickets.map((no) => esc(no)).join("<br />")
    : "—";
  const confirmDisplay = dash(confirm === "—" && hasHotel ? locator : confirm);

  const customerRows = lines
    .map((line, index) => {
      const svc = servicePair(line.serviceType);
      return `<tr>
        <td class="idx">${index + 1}</td>
        <td><b>${esc(svc.ar)}</b> <i>${esc(svc.en)}</i></td>
        <td class="ltr">${esc(line.bookingRef)}</td>
        <td class="ltr">${esc(line.ticketOrConfirm)}</td>
        <td class="num">${money(line.sellAmount, currency)}</td>
      </tr>`;
    })
    .join("");

  const costRows = lines
    .map((line) => {
      const svc = servicePair(line.serviceType);
      return `<tr>
        <td><b>${esc(svc.ar)}</b> <i>${esc(svc.en)}</i></td>
        <td class="ltr">${esc(line.ticketOrConfirm)}</td>
        <td class="ltr">${esc(line.bookingRef)}</td>
        <td class="num">${money(line.costAmount, currency)}</td>
        <td class="num">${money(line.sellAmount, currency)}</td>
        <td class="num">${money(line.profitAmount, currency)}</td>
      </tr>`;
    })
    .join("");

  const flightBlock = hasFlight
    ? `<section class="box">
        ${sectionTitle("تفاصيل الرحلة", "FLIGHT")}
        <div class="grid-2">
          ${kv("شركة الطيران", "Airline", esc(extra(row, "airline") || extra(row, "airlineName") || "—"))}
          ${kv("رقم الرحلة", "Flight", esc(extra(row, "flightNumber") || extra(row, "flight") || "—"))}
          ${kv("المغادرة", "Departure", `${esc(origin)} <small class="ltr">${esc(formatPrintDate(bookingTravelDate(row)))}</small>`)}
          ${kv("الوصول", "Arrival", `${esc(dest)}${bookingReturnDate(row) ? ` <small class="ltr">${esc(formatPrintDate(bookingReturnDate(row)))}</small>` : ""}`)}
          ${kv("الدرجة", "Class", `${esc(cabin.ar)} <i>| ${esc(cabin.en)}</i>`)}
          ${kv("الأمتعة", "Baggage", esc(extra(row, "baggage") || extra(row, "bags") || "—"))}
        </div>
      </section>`
    : "";

  const hotelBlock = hasHotel
    ? `<section class="box">
        ${sectionTitle("تفاصيل الفندق", "HOTEL")}
        <div class="grid-2">
          ${kv("الفندق", "Hotel", esc(hotelName))}
          ${kv("رقم التأكيد", "Confirmation", `<span class="ltr">${esc(confirmDisplay)}</span>`)}
          ${kv("تسجيل الدخول", "Check-in", `<span class="ltr">${esc(formatPrintDate(row.passengerDetails?.stay?.checkIn || bookingTravelDate(row)))}</span>`)}
          ${kv("تسجيل المغادرة", "Check-out", `<span class="ltr">${esc(formatPrintDate(row.passengerDetails?.stay?.checkOut || bookingReturnDate(row)))}</span>`)}
          ${kv("عدد الليالي", "Nights", nights ? `${nights}` : "—")}
          ${kv("الغرفة", "Room", esc(roomName))}
          ${kv("الوجبات", "Meal Plan", esc(boardName))}
          ${kv("النزلاء", "Guests", String(guestCount))}
        </div>
      </section>`
    : "";

  return `<article class="doc">
    <header class="mast">
      <div class="brand-wrap">
        <img src="${esc(logoUrl())}" alt="WeekendGate" class="logo" />
        <div>
          <div class="legal">${esc(COMPANY_LEGAL.legalNameAr)}</div>
          <div class="legal en ltr">${esc(COMPANY_LEGAL.legalNameEn)}</div>
        </div>
      </div>
      <div class="doc-title">
        <span>فاتورة وتأكيد الحجز</span>
        <strong>INVOICE &amp; BOOKING CONFIRMATION</strong>
        <em class="ltr">#${esc(row.id.slice(0, 8).toUpperCase())}</em>
      </div>
    </header>

    <div class="refs">
      ${refCell("رقم الحجز", "Booking No.", esc(locator))}
      ${
        hasFlight
          ? refCell("رقم التذكرة", "Ticket No.", ticketDisplay)
          : ""
      }
      ${
        hasHotel
          ? refCell("رقم التأكيد", "Confirmation", esc(confirmDisplay))
          : ""
      }
      ${refCell(
        "الحالة",
        "Status",
        `${esc(BOOKING_STATUS_LABEL[row.status] || row.status)} | ${esc(BOOKING_STATUS_LABEL_EN[row.status] || row.status)}`,
        false,
      )}
    </div>

    <section class="box">
      ${sectionTitle("بيانات العميل", "CUSTOMER")}
      <div class="grid-2">
        ${kv("الاسم", "Name", esc(travelerNames))}
        ${kv("الهاتف", "Phone", `<span class="ltr">${esc(phone)}</span>`)}
        ${kv("البريد", "Email", `<span class="ltr">${esc(email)}</span>`)}
        ${kv("تاريخ الحجز", "Booking Date", `<span class="ltr">${esc(formatPrintDate(row.createdAt))}</span>`)}
      </div>
    </section>

    ${flightBlock}
    ${hotelBlock}

    <section class="box fare">
      ${sectionTitle("فاتورة العميل", "CUSTOMER INVOICE")}
      <table class="sheet">
        <thead>
          <tr>
            <th>#</th>
            <th>الخدمة <i>Service</i></th>
            <th>رقم الحجز <i>Booking No.</i></th>
            <th>رقم التذكرة / التأكيد <i>Ticket / Confirm</i></th>
            <th>سعر البيع <i>Sell</i></th>
          </tr>
        </thead>
        <tbody>${customerRows}</tbody>
      </table>
      <div class="totals">
        <div class="grand"><span>الإجمالي <i>Grand total</i></span>${money(sellTotal, currency)}</div>
        <div><span>المدفوع <i>Paid</i></span>${money(paid, currency)}</div>
        <div class="remain"><span>المتبقي <i>Balance</i></span>${money(remaining, currency)}</div>
      </div>
    </section>

    <section class="box cost-block">
      ${sectionTitle("تكلفة الوكالة", "AGENCY COST")}
      <p class="cost-note">جدول داخلي: رقم التذكرة، رقم الحجز، التكلفة، البيع، والربح.</p>
      <table class="sheet cost-sheet">
        <thead>
          <tr>
            <th>الخدمة <i>Service</i></th>
            <th>رقم التذكرة / التأكيد <i>Ticket / Confirm</i></th>
            <th>رقم الحجز <i>Booking No.</i></th>
            <th>التكلفة <i>Cost</i></th>
            <th>البيع <i>Sell</i></th>
            <th>الربح <i>Profit</i></th>
          </tr>
        </thead>
        <tbody>${costRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">الإجمالي <i>Totals</i></td>
            <td class="num">${money(costTotals.cost, currency)}</td>
            <td class="num">${money(costTotals.sell, currency)}</td>
            <td class="num">${money(costTotals.profit, currency)}</td>
          </tr>
        </tfoot>
      </table>
    </section>

    <section class="box pay">
      ${sectionTitle("تأكيد الدفع", "PAYMENT")}
      <div class="pay-ref ltr">${esc(payRef)}</div>
      <div class="grid-2">
        ${kv("حالة الدفع", "Payment Status", `${esc(PAYMENT_STATUS_LABEL[payStatus] || payStatus)} <i>| ${esc(PAYMENT_STATUS_LABEL_EN[payStatus] || payStatus)}</i>`)}
        ${kv("طريقة الدفع", "Payment Method", `${esc(PAYMENT_METHOD_LABEL[payMethod] || payMethod)} <i>| ${esc(PAYMENT_METHOD_LABEL_EN[payMethod] || payMethod)}</i>`)}
        ${kv("تاريخ الدفع", "Payment Date", `<span class="ltr">${esc(formatPrintDate(payDate))}</span>`)}
        ${kv("الوكالة", "Agency", esc(orgName || COMPANY_LEGAL.brandName))}
      </div>
      <p class="contact">
        <span class="ltr">${esc(COMPANY_LEGAL.phoneE164)}</span>
        · <span class="ltr">${esc(COMPANY_LEGAL.supportEmail)}</span>
        · ${esc(COMPANY_LEGAL.addressAr)}
      </p>
      <p class="disclaimer">
        ${esc(COMPANY_LEGAL.roleClarificationAr)}
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
  background: #e6ecea;
  direction: rtl;
}
.ltr { direction: ltr; unicode-bidi: isolate; display: inline-block; text-align: start; }
.toolbar {
  position: sticky; top: 0; z-index: 5;
  display: flex; gap: 12px; align-items: center; justify-content: center; flex-wrap: wrap;
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
  border: 1px solid #d5dfdc; padding: 20px 22px 26px;
  box-shadow: 0 10px 28px rgba(15,51,64,.08);
}
.mast {
  display: flex; justify-content: space-between; gap: 16px; align-items: center;
  border-bottom: 4px solid #d8a35e; padding-bottom: 12px; margin-bottom: 12px;
}
.brand-wrap { display: flex; gap: 10px; align-items: center; }
.logo { height: 46px; width: auto; }
.legal { font-size: 12px; color: #5f7470; margin-top: 2px; }
.legal.en { font-size: 11px; }
.doc-title { text-align: left; }
.doc-title span { display: block; font-size: 18px; font-weight: 800; color: #184a52; }
.doc-title strong { display: block; font-size: 11px; letter-spacing: .06em; color: #7a8b86; }
.doc-title em { display: block; margin-top: 4px; font-style: normal; font-weight: 800; color: #d8a35e; }
.refs {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 1px; background: #d8a35e; border-radius: 10px; overflow: hidden; margin-bottom: 12px;
}
.refs > div { background: #0f3340; color: #fff; padding: 10px 12px; }
.refs span { display: grid; gap: 1px; margin-bottom: 6px; }
.refs span b { font-size: 12px; color: #d8a35e; font-weight: 800; }
.refs span i { font-style: normal; font-size: 10px; color: #f3e2c4; font-weight: 600; }
.refs strong { font-size: 14px; word-break: break-word; display: block; line-height: 1.45; }
.box { border: 1px solid #d7e2de; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; }
h3 { margin: 0 0 10px; display: flex; justify-content: space-between; gap: 8px; align-items: baseline;
  font-size: 15px; color: #0f3340; border-bottom: 1px solid #edf2f0; padding-bottom: 6px; }
h3 i { font-style: normal; font-size: 11px; letter-spacing: .04em; color: #7a8b86; font-weight: 800; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.kv { display: grid; gap: 3px; min-width: 0; }
.lab { color: #5f7470; font-size: 11px; font-weight: 700; display: grid; gap: 1px; }
.lab em { font-style: normal; color: #8a9b97; font-weight: 600; font-size: 10px; }
.kv strong { font-size: 14px; color: #0f3340; font-weight: 800; }
.kv small { color: #5f7470; font-weight: 600; font-size: 12px; }
table.sheet { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.sheet th, .sheet td { border: 1px solid #d7e4df; padding: 8px 8px; text-align: start; vertical-align: top; }
.sheet th { background: #0f3340; color: #f3f7f4; font-weight: 700; }
.sheet th i, .sheet td i, .sheet tfoot i { font-style: normal; opacity: .78; font-weight: 600; font-size: 10px; display: block; }
.sheet td.idx { width: 28px; color: #7a8b86; font-weight: 800; }
.sheet td.ltr { white-space: nowrap; direction: ltr; unicode-bidi: isolate; }
.sheet td.num, .sheet th:last-child { white-space: nowrap; }
.num { font-variant-numeric: tabular-nums; font-weight: 800; }
.totals { margin-top: 10px; display: grid; gap: 6px; max-width: 360px; margin-inline-start: auto; }
.totals div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 10px; background: #f4f7f6; align-items: center; }
.totals .remain { background: #f7ecda; }
.totals .grand { background: #0f3340; color: #fff; }
.totals .grand i { color: #d8a35e; }
.totals i { font-style: normal; color: #7a8b86; font-size: 11px; }
.pay-ref {
  font-size: 18px; font-weight: 800; letter-spacing: .06em;
  background: #0f3340; color: #fff; padding: 8px 12px; border-radius: 8px; margin: 0 0 12px;
  text-align: center;
}
.contact { margin: 12px 0 8px; color: #184a52; font-weight: 700; font-size: 13px; }
.disclaimer { font-size: 11px; color: #5f7470; line-height: 1.7; margin: 0; }
.disclaimer span { display: block; margin-top: 6px; }
.cost-note { margin: 0 0 8px; color: #7a4a10; font-size: 12px; font-weight: 700; }
.cost-block { display: none; border-color: #d8a35e; background: #fffaf2; }
.cost-sheet th { background: #7a4a10; }
.cost-sheet tfoot td { background: #f7ecda; font-weight: 800; }
body.show-cost .cost-block { display: block; }
@page { size: A4; margin: 10mm; }
@media print {
  body { background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .toolbar { display: none !important; }
  .doc { margin: 0; max-width: none; box-shadow: none; border: 0; padding: 0; }
  .cost-block { break-inside: avoid; }
}
@media (max-width: 700px) { .grid-2, .mast { grid-template-columns: 1fr; display: grid; } }
`;

export function buildBookingInvoiceHtml(
  rows: BookingInvoiceData[],
  orgName = "WeekendGate",
  options: PrintBookingOptions = {},
) {
  const canToggleCost = rows.some(bookingHasCost);
  const startWithCost = Boolean(options.includeCost && canToggleCost);
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة وتأكيد الحجز</title>
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
      var btn = document.getElementById("printBtn");
      if (btn) btn.addEventListener("click", function () { window.print(); });
    })();
  </script>
</body>
</html>`;
}

export function printBookingInvoices(
  rows: BookingInvoiceData[],
  orgName = "WeekendGate",
  options: PrintBookingOptions = {},
) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;
  const html = buildBookingInvoiceHtml(rows, orgName, options);

  const popup = window.open("", "_blank", "width=920,height=1100");
  if (!popup) {
    throw new Error("اسمح بالنوافذ المنبثقة لطباعة التقرير والفاتورة");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
}
