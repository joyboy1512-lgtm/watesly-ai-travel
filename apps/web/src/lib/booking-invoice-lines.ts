export type BookingInvoicePayment = {
  id?: string;
  status: string;
  method?: string;
  amount: number;
  currency?: string;
  reference?: string | null;
  createdAt?: string;
};

export type BookingInvoiceTraveler = {
  firstName?: string;
  lastName?: string;
  ticketNumber?: string;
  ticketNo?: string;
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
    selectedQuoteItemId?: string;
    contact?: { email?: string; phone?: string };
    serviceType?: string;
    description?: string;
    ticketType?: string;
    seatPref?: string;
    extras?: Record<string, unknown>;
    travelers?: BookingInvoiceTraveler[];
    guests?: BookingInvoiceTraveler[];
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

export type InvoiceSaleLine = {
  serviceType: string;
  description: string;
  bookingRef: string;
  ticketOrConfirm: string;
  sellAmount: number;
  costAmount: number;
  profitAmount: number;
  kind: "flight" | "hotel" | "other";
};

const EMPTY = "—";

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function extrasRoot(row: BookingInvoiceData): Record<string, unknown> {
  const extras = row.passengerDetails?.extras;
  return extras && typeof extras === "object" ? extras : {};
}

function extrasNested(row: BookingInvoiceData): Record<string, unknown> {
  const extras = extrasRoot(row);
  const details =
    extras.details && typeof extras.details === "object"
      ? (extras.details as Record<string, unknown>)
      : extras;
  return details && typeof details === "object" ? details : extras;
}

export function extraValue(row: BookingInvoiceData, key: string): unknown {
  const nested = extrasNested(row);
  const extras = extrasRoot(row);
  if (nested[key] != null && nested[key] !== "") return nested[key];
  if (extras[key] != null && extras[key] !== "") return extras[key];
  return undefined;
}

export function extra(row: BookingInvoiceData, key: string): string {
  return str(extraValue(row, key));
}

function asStringList(value: unknown): string[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value.flatMap(asStringList);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return asStringList(
      obj.ticketNumber ??
        obj.ticketNo ??
        obj.eticket ??
        obj.eTicket ??
        obj.number ??
        obj.confirmationNo ??
        obj.confirmationNumber ??
        obj.confirmation ??
        obj.pnr,
    );
  }
  return str(value)
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter((part) => part && part !== EMPTY);
}

function uniqueRefs(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.replace(/\s+/g, "").toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function bookingLocator(row: BookingInvoiceData): string {
  return (
    extra(row, "pnr") ||
    extra(row, "bookingRef") ||
    extra(row, "bookingNumber") ||
    extra(row, "locator") ||
    extra(row, "providerBookingRef") ||
    str(row.providerBookingRef) ||
    row.id.slice(0, 8).toUpperCase()
  );
}

export function hotelConfirmation(row: BookingInvoiceData): string {
  return (
    extra(row, "confirmationNo") ||
    extra(row, "confirmationNumber") ||
    extra(row, "confirmation") ||
    extra(row, "hotelConfirmation") ||
    extra(row, "voucherNo") ||
    extra(row, "bookingConfirmation") ||
    str(row.providerBookingRef) ||
    EMPTY
  );
}

export function ticketNumbers(row: BookingInvoiceData): string[] {
  const fromExtras = [
    extraValue(row, "ticketNumbers"),
    extraValue(row, "tickets"),
    extraValue(row, "eticketNumbers"),
    extraValue(row, "eTickets"),
    extraValue(row, "ticketNumber"),
    extraValue(row, "ticketNo"),
    extraValue(row, "eTicket"),
    extraValue(row, "eticket"),
  ].flatMap(asStringList);

  const people = [
    ...(row.passengerDetails?.travelers || []),
    ...(row.passengerDetails?.guests || []),
  ];
  const fromPeople = people.flatMap((person) =>
    asStringList(person.ticketNumber || person.ticketNo),
  );

  return uniqueRefs([...fromExtras, ...fromPeople]);
}

function selectedItemId(row: BookingInvoiceData): string {
  return (
    str(row.passengerDetails?.selectedQuoteItemId) ||
    extra(row, "selectedQuoteItemId") ||
    extra(row, "selectedItemId")
  );
}

function syntheticItem(row: BookingInvoiceData): BookingInvoiceItem {
  return {
    serviceType:
      row.passengerDetails?.serviceType ||
      (row.passengerDetails?.stay ? "hotel" : row.passengerDetails?.route ? "flight" : "travel"),
    description:
      row.passengerDetails?.description ||
      row.quote?.items?.[0]?.description ||
      "حجز",
    sellAmount: row.totalSellAmount,
    costAmount: row.totalCostAmount,
    profitAmount: row.totalProfitAmount,
  };
}

function amountsClose(a?: number, b?: number): boolean {
  return Math.abs((a || 0) - (b || 0)) <= 2;
}

/** Booked quote line(s) only — never dump unused fare-family alternatives. */
export function bookedQuoteItems(row: BookingInvoiceData): BookingInvoiceItem[] {
  const items = [...(row.quote?.items || [])];
  const total = row.totalSellAmount || 0;
  const selectedId = selectedItemId(row);

  if (selectedId) {
    const selected = items.filter((item) => item.id === selectedId);
    if (selected.length) {
      const others = items.filter(
        (item) => item.id !== selectedId && item.serviceType !== selected[0]?.serviceType,
      );
      const packageSum =
        (selected[0]?.sellAmount || 0) +
        others.reduce((sum, item) => sum + (item.sellAmount || 0), 0);
      if (others.length && amountsClose(packageSum, total)) {
        return [...selected, ...others];
      }
      return selected;
    }
  }

  if (!items.length) return [syntheticItem(row)];

  const exact = items.filter((item) => amountsClose(item.sellAmount, total));
  if (exact.length === 1) return exact;

  const sum = items.reduce((acc, item) => acc + (item.sellAmount || 0), 0);
  if (amountsClose(sum, total)) return items;

  const types = new Set(items.map((item) => (item.serviceType || "").toLowerCase()));
  if (types.size === 1 && items.length > 1) {
    return [
      items.reduce((best, item) =>
        Math.abs((item.sellAmount || 0) - total) < Math.abs((best.sellAmount || 0) - total)
          ? item
          : best,
      ),
    ];
  }

  const description = str(row.passengerDetails?.description);
  if (description) {
    const named = items.filter((item) => item.description === description);
    if (named.length) return named;
  }

  return items;
}

function hotelStaySell(row: BookingInvoiceData, item: BookingInvoiceItem): number {
  const breakdown = extraValue(row, "priceBreakdown");
  if (breakdown && typeof breakdown === "object") {
    const bd = breakdown as Record<string, unknown>;
    const stay =
      Number(bd.payNowMinor ?? bd.totalMinor ?? bd.sellAmountMinor ?? bd.stayTotalMinor) || 0;
    if (stay > 0) return Math.round(stay);
  }
  if ((item.sellAmount || 0) > 0) return item.sellAmount || 0;
  return row.totalSellAmount || 0;
}

function splitAmount(total: number, index: number, count: number): number {
  if (count <= 1) return total;
  const base = Math.round(total / count);
  if (index === count - 1) return total - base * (count - 1);
  return base;
}

function kindOf(serviceType?: string): InvoiceSaleLine["kind"] {
  const key = (serviceType || "").toLowerCase();
  if (key === "hotel") return "hotel";
  if (key === "flight" || key === "travel") return "flight";
  return "other";
}

export function invoiceSaleLines(row: BookingInvoiceData): InvoiceSaleLine[] {
  const items = bookedQuoteItems(row);
  const locator = bookingLocator(row);
  const tickets = ticketNumbers(row);
  const confirm = hotelConfirmation(row);
  const lines: InvoiceSaleLine[] = [];

  for (const item of items) {
    const kind = kindOf(item.serviceType);
    const cost = item.costAmount || 0;
    const profit =
      item.profitAmount != null ? item.profitAmount : (item.sellAmount || 0) - cost;

    if (kind === "hotel") {
      const sell = hotelStaySell(row, item);
      lines.push({
        serviceType: item.serviceType || "hotel",
        description: item.description,
        bookingRef: locator,
        ticketOrConfirm: confirm !== EMPTY ? confirm : locator,
        sellAmount: sell,
        costAmount: cost,
        profitAmount: profit || sell - cost,
        kind,
      });
      continue;
    }

    const refs = kind === "flight" && tickets.length ? tickets : [EMPTY];
    const sellTotal = item.sellAmount ?? row.totalSellAmount ?? 0;
    refs.forEach((ticket, index) => {
      const sell = splitAmount(sellTotal, index, refs.length);
      const lineCost = splitAmount(cost, index, refs.length);
      lines.push({
        serviceType: item.serviceType || "flight",
        description: item.description,
        bookingRef: locator,
        ticketOrConfirm: ticket,
        sellAmount: sell,
        costAmount: lineCost,
        profitAmount: splitAmount(profit, index, refs.length),
        kind,
      });
    });
  }

  return lines.length ? lines : [syntheticLine(row, locator)];
}

function syntheticLine(row: BookingInvoiceData, locator: string): InvoiceSaleLine {
  const kind = kindOf(row.passengerDetails?.serviceType);
  const confirm = hotelConfirmation(row);
  const tickets = ticketNumbers(row);
  return {
    serviceType: row.passengerDetails?.serviceType || "travel",
    description: row.passengerDetails?.description || "حجز",
    bookingRef: locator,
    ticketOrConfirm:
      kind === "hotel" ? (confirm !== EMPTY ? confirm : locator) : tickets[0] || EMPTY,
    sellAmount: row.totalSellAmount || 0,
    costAmount: row.totalCostAmount || 0,
    profitAmount: row.totalProfitAmount || 0,
    kind,
  };
}

export function invoiceSellTotal(row: BookingInvoiceData): number {
  const lines = invoiceSaleLines(row);
  const sum = lines.reduce((acc, line) => acc + (line.sellAmount || 0), 0);
  return sum > 0 ? sum : row.totalSellAmount || 0;
}

export function invoiceCostTotals(row: BookingInvoiceData): {
  cost: number;
  sell: number;
  profit: number;
} {
  const lines = invoiceSaleLines(row);
  const cost = lines.reduce((acc, line) => acc + (line.costAmount || 0), 0);
  const sell = lines.reduce((acc, line) => acc + (line.sellAmount || 0), 0);
  const profit = lines.reduce((acc, line) => acc + (line.profitAmount || 0), 0);
  return {
    cost: cost || row.totalCostAmount || 0,
    sell: sell || row.totalSellAmount || 0,
    profit: profit || row.totalProfitAmount || sell - cost,
  };
}

export function bookingHasCost(row: BookingInvoiceData) {
  return (
    row.totalCostAmount != null ||
    bookedQuoteItems(row).some((item) => item.costAmount != null)
  );
}

export function dash(value?: string | null) {
  const text = str(value);
  return text || EMPTY;
}
