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

export type BookingInvoiceData = {
  id: string;
  status: string;
  providerBookingRef?: string | null;
  totalSellAmount: number;
  createdAt: string;
  issuedAt?: string | null;
  passengerDetails?: {
    contact?: { email?: string; phone?: string };
    serviceType?: string;
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
    items?: Array<{
      id?: string;
      serviceType: string;
      description: string;
      sellAmount?: number;
    }>;
  } | null;
  payments?: BookingInvoicePayment[];
};

export const BOOKING_STATUS_LABEL: Record<string, string> = {
  draft: "مسودة",
  on_hold: "معلّق / بانتظار",
  issued: "مُصدَر",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: "مدفوع",
  unpaid: "غير مدفوع",
  pending: "قيد الانتظار",
  refunded: "مسترد",
  failed: "فشل",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  manual: "يدوي",
  cash: "نقدًا",
  card: "بطاقة",
  transfer: "تحويل بنكي",
  knet: "كي نت",
  online: "إلكتروني",
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

function esc(value?: string | number | null) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function invoiceHtml(row: BookingInvoiceData, orgName: string) {
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
  const ref = row.providerBookingRef || row.id.slice(0, 8);
  const items = row.quote?.items?.length
    ? row.quote.items
    : [
        {
          serviceType: row.passengerDetails?.serviceType || "travel",
          description: routeLabel(row),
          sellAmount: row.totalSellAmount,
        },
      ];

  const travelerRows = travelers.length
    ? travelers
        .map(
          (t, i) =>
            `<tr><td>${i + 1}</td><td>${esc([t.firstName, t.lastName].filter(Boolean).join(" ") || "—")}</td></tr>`,
        )
        .join("")
    : `<tr><td>1</td><td>${esc(customerName(row))}</td></tr>`;

  const itemRows = items
    .map(
      (item) => `<tr>
        <td>${esc(item.serviceType === "hotel" ? "فندق" : item.serviceType === "flight" ? "طيران" : item.serviceType)}</td>
        <td>${esc(item.description)}</td>
        <td>${esc(formatMoneyMinor(item.sellAmount ?? 0, currency))}</td>
      </tr>`,
    )
    .join("");

  const payments = row.payments || [];
  const paymentRows = payments.length
    ? payments
        .map(
          (p) => `<tr>
            <td>${esc(PAYMENT_STATUS_LABEL[p.status] || p.status)}</td>
            <td>${esc(PAYMENT_METHOD_LABEL[p.method || ""] || p.method || "—")}</td>
            <td>${esc(p.reference || "—")}</td>
            <td>${esc(formatMoneyMinor(p.amount, p.currency || currency))}</td>
            <td>${esc(p.createdAt ? formatDay(p.createdAt) : "—")}</td>
          </tr>`,
        )
        .join("")
    : `<tr><td colspan="5">لا توجد مدفوعات مسجّلة</td></tr>`;

  const stay = row.passengerDetails?.stay;
  const tripBlock = stay
    ? `<p><strong>الإقامة:</strong> ${esc(stay.locationLabel || stay.location || "—")}<br/>
       <strong>من:</strong> ${esc(formatDay(stay.checkIn))} &nbsp; <strong>إلى:</strong> ${esc(formatDay(stay.checkOut))}</p>`
    : `<p><strong>المسار:</strong> ${esc(routeLabel(row))}<br/>
       <strong>تاريخ السفر:</strong> ${esc(formatDay(bookingTravelDate(row)))}
       ${bookingReturnDate(row) ? ` &nbsp; <strong>العودة:</strong> ${esc(formatDay(bookingReturnDate(row)))}` : ""}
       ${row.passengerDetails?.route?.cabinClass ? `<br/><strong>الدرجة:</strong> ${esc(row.passengerDetails.route.cabinClass)}` : ""}</p>`;

  return `<article class="invoice">
    <header>
      <div>
        <div class="brand">WeekendGate</div>
        <div class="org">${esc(orgName || "وكالة سفر")}</div>
      </div>
      <div class="inv-meta">
        <strong>فاتورة حجز</strong>
        <span>رقم الفاتورة: ${esc(ref)}</span>
        <span>تاريخ الحجز: ${esc(formatDay(row.createdAt))}</span>
        ${row.issuedAt ? `<span>تاريخ الإصدار: ${esc(formatDay(row.issuedAt))}</span>` : ""}
        <span>الحالة: ${esc(BOOKING_STATUS_LABEL[row.status] || row.status)}</span>
      </div>
    </header>
    <section>
      <h3>بيانات العميل</h3>
      <p><strong>${esc(customerName(row))}</strong><br/>
      هاتف: ${esc(phone)} · بريد: ${esc(email)}</p>
    </section>
    <section>
      <h3>تفاصيل الرحلة / الخدمة</h3>
      ${tripBlock}
    </section>
    <section>
      <h3>المسافرون</h3>
      <table><thead><tr><th>#</th><th>الاسم</th></tr></thead><tbody>${travelerRows}</tbody></table>
    </section>
    <section>
      <h3>بنود الفاتورة</h3>
      <table>
        <thead><tr><th>الخدمة</th><th>الوصف</th><th>المبلغ</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
    </section>
    <section>
      <h3>تفاصيل الدفع</h3>
      <table>
        <thead><tr><th>الحالة</th><th>الطريقة</th><th>المرجع</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
        <tbody>${paymentRows}</tbody>
      </table>
      <div class="totals">
        <div><span>الإجمالي</span><strong>${esc(formatMoneyMinor(row.totalSellAmount, currency))}</strong></div>
        <div><span>المدفوع</span><strong>${esc(formatMoneyMinor(paid, currency))}</strong></div>
        <div class="remain"><span>المتبقي</span><strong>${esc(formatMoneyMinor(remaining, currency))}</strong></div>
      </div>
    </section>
    <footer>WeekendGate · فاتورة صادرة من النظام · ${esc(formatDay(new Date().toISOString()))}</footer>
  </article>`;
}

export function printBookingInvoices(
  rows: BookingInvoiceData[],
  orgName = "WeekendGate",
) {
  if (typeof window === "undefined") return;
  if (!rows.length) return;
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فاتورة حجز</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Tahoma, sans-serif; color: #142028; background: #fff; }
    .invoice { padding: 18px 22px; page-break-after: always; }
    .invoice:last-child { page-break-after: auto; }
    header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 3px solid #d8a35e; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 22px; font-weight: 800; color: #0f3340; }
    .org { color: #5f7470; margin-top: 4px; }
    .inv-meta { text-align: left; display: grid; gap: 3px; font-size: 13px; color: #184a52; }
    .inv-meta strong { font-size: 18px; color: #0f3340; }
    h3 { margin: 0 0 8px; color: #0f3340; font-size: 15px; }
    section { margin-bottom: 14px; }
    p { margin: 0; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #d7e4df; padding: 7px 8px; text-align: right; }
    th { background: #0f3340; color: #f3f7f4; }
    .totals { margin-top: 10px; display: grid; gap: 6px; max-width: 280px; margin-inline-start: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 6px 8px; background: #f4f7f6; }
    .totals .remain { background: #f7ecda; }
    footer { margin-top: 18px; font-size: 11px; color: #7a8b86; border-top: 1px dashed #c5d2cd; padding-top: 8px; }
    @page { size: A4; margin: 12mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
${rows.map((row) => invoiceHtml(row, orgName)).join("\n")}
</body>
</html>`;

  const popup = window.open("", "_blank", "width=900,height=1000");
  if (!popup) {
    throw new Error("اسمح بالنوافذ المنبثقة لطباعة الفاتورة كملف PDF");
  }
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  const trigger = () => {
    popup.print();
  };
  if (popup.document.readyState === "complete") {
    setTimeout(trigger, 200);
  } else {
    popup.onload = () => setTimeout(trigger, 200);
  }
}
