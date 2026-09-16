/** ±N day helpers for flexible-date search and price calendars. */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function shiftIsoDate(iso: string, days: number): string {
  const text = String(iso || "").slice(0, 10);
  if (!ISO.test(text)) return text;
  const [y, m, d] = text.split("-").map(Number);
  const utc = new Date(Date.UTC(y!, m! - 1, d!));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function nightsBetweenIso(from: string, to: string): number {
  if (!ISO.test(from) || !ISO.test(to)) return 1;
  const a = new Date(`${from}T12:00:00Z`).getTime();
  const b = new Date(`${to}T12:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.round((b - a) / 86400000));
}

export function flexibleOffsets(span = 3): number[] {
  const n = Math.max(1, Math.min(7, Math.floor(span)));
  const out: number[] = [];
  for (let i = -n; i <= n; i += 1) out.push(i);
  return out;
}

export type FlexibleDateCell = {
  offset: number;
  departDate: string;
  returnDate?: string;
};

/** Keep trip length when shifting a round-trip window. */
export function flexibleDateCells(opts: {
  departDate: string;
  returnDate?: string;
  span?: number;
}): FlexibleDateCell[] {
  const nights = opts.returnDate
    ? nightsBetweenIso(opts.departDate, opts.returnDate)
    : 0;
  return flexibleOffsets(opts.span ?? 3).map((offset) => {
    const departDate = shiftIsoDate(opts.departDate, offset);
    return {
      offset,
      departDate,
      returnDate: nights
        ? shiftIsoDate(departDate, nights)
        : opts.returnDate || undefined,
    };
  });
}

export function weekdayIndex(iso: string): number {
  const text = String(iso || "").slice(0, 10);
  if (!ISO.test(text)) return 0;
  const [y, m, d] = text.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}
