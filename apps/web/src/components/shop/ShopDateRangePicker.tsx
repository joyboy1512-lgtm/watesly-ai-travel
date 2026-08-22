"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  className?: string;
};

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(iso: string, days: number) {
  const d = parseIso(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + days);
  return toIso(d);
}

function formatShort(iso: string) {
  const d = parseIso(iso);
  if (!d) return "—";
  return d.toLocaleDateString("ar-KW", { weekday: "short", day: "numeric", month: "short" });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("ar-KW", { month: "long", year: "numeric" });
}

const WEEKDAYS = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

export function ShopDateRangePicker({ checkIn, checkOut, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"checkin" | "checkout">("checkin");
  const [draftIn, setDraftIn] = useState(checkIn);
  const [draftOut, setDraftOut] = useState(checkOut);
  const [viewYear, setViewYear] = useState(() => {
    const d = parseIso(checkIn) || new Date();
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseIso(checkIn) || new Date();
    return d.getMonth();
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const todayIso = useMemo(() => toIso(new Date()), []);

  useEffect(() => {
    if (!open) return;
    setDraftIn(checkIn);
    setDraftOut(checkOut);
    setPhase("checkin");
    const d = parseIso(checkIn) || new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, checkIn, checkOut]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function pickDay(iso: string) {
    if (iso < todayIso) return;
    if (phase === "checkin") {
      setDraftIn(iso);
      setDraftOut(iso >= draftOut ? addDays(iso, 1) : draftOut);
      setPhase("checkout");
      return;
    }
    if (iso <= draftIn) {
      setDraftIn(iso);
      setDraftOut(addDays(iso, 1));
      setPhase("checkout");
      return;
    }
    setDraftOut(iso);
    onChange(draftIn, iso);
    setOpen(false);
  }

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const rows: Array<{ iso: string; day: number; muted: boolean } | null> = [];
    for (let i = 0; i < startPad; i += 1) rows.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = toIso(new Date(viewYear, viewMonth, day));
      rows.push({ iso, day, muted: iso < todayIso });
    }
    return rows;
  }, [viewYear, viewMonth, todayIso]);

  function inRange(iso: string) {
    if (!draftIn || !draftOut) return false;
    return iso > draftIn && iso < draftOut;
  }

  const summary = open
    ? draftIn && draftOut
      ? `${formatShort(draftIn)} – ${formatShort(draftOut)}`
      : draftIn
        ? `${formatShort(draftIn)} – …`
        : "اختر تواريخ الإقامة"
    : checkIn && checkOut
      ? `${formatShort(checkIn)} – ${formatShort(checkOut)}`
      : "اختر تواريخ الإقامة";

  function dayClass(iso: string, muted: boolean) {
    const isStart = iso === draftIn;
    const isEnd = iso === draftOut;
    const between = inRange(iso);
    return [
      "shop-date-range-day",
      muted ? "muted" : "",
      isStart ? "selected range-start" : "",
      isEnd ? "selected range-end" : "",
      between ? "in-range" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    <div className={`shop-date-range${className ? ` ${className}` : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="shop-date-range-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {summary}
      </button>
      {open ? (
        <div className="shop-date-range-pop">
          <div className="shop-date-range-head">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="الشهر السابق">
              ‹
            </button>
            <strong>{monthLabel(viewYear, viewMonth)}</strong>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="الشهر التالي">
              ›
            </button>
          </div>
          <p className="shop-date-range-phase">
            {phase === "checkin" ? "اختر تاريخ الوصول" : "اختر تاريخ المغادرة"}
          </p>
          <div className="shop-date-range-weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="shop-date-range-grid">
            {cells.map((cell, i) =>
              cell ? (
                <button
                  key={cell.iso}
                  type="button"
                  className={dayClass(cell.iso, cell.muted)}
                  disabled={cell.muted}
                  onClick={() => pickDay(cell.iso)}
                >
                  {cell.day}
                </button>
              ) : (
                <span key={`pad-${i}`} className="shop-date-range-pad" />
              ),
            )}
          </div>
          <div className="shop-date-range-footer">
            <span>
              {formatShort(draftIn)} → {formatShort(draftOut)}
            </span>
            <button
              type="button"
              className="exp-pop-done"
              onClick={() => {
                if (draftIn && draftOut && draftOut > draftIn) {
                  onChange(draftIn, draftOut);
                  setOpen(false);
                }
              }}
            >
              تم
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
