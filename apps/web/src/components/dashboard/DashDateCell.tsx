"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useDashI18n } from "@/lib/dashboard-i18n";

export function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatIsoDateDisplay(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function openNativeDatePicker(el: HTMLInputElement | null) {
  if (!el) return;
  try {
    const picker = (el as HTMLInputElement & { showPicker?: () => void }).showPicker;
    if (typeof picker === "function") picker.call(el);
    else el.focus();
  } catch {
    el.focus();
  }
}

export function DashDateCell({
  label,
  value,
  onChange,
  hint,
  min,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  /** Omit to block past dates. Pass "" to allow any date (filters). */
  min?: string;
  className?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const i18n = useDashI18n();
  const emptyLabel = placeholder || i18n.c("pickDate");
  const floor = min === undefined ? todayIsoDate() : min;

  function openPicker() {
    openNativeDatePicker(inputRef.current);
  }

  return (
    <label
      className={`fs-cell fs-date-cell${className ? ` ${className}` : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") openPicker();
      }}
    >
      <span>{label}</span>
      <em className={`fs-date-value${value ? "" : " placeholder"}`}>
        {value ? formatIsoDateDisplay(value) : emptyLabel}
      </em>
      <input
        ref={inputRef}
        className="fs-date-native"
        type="date"
        min={floor || undefined}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (floor && next && next < floor) return;
          onChange(next);
        }}
        onClick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function DashPortalMenu({
  open,
  anchorRef,
  onClose,
  children,
  className,
  matchWidth = true,
  offset = 4,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  matchWidth?: boolean;
  offset?: number;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 240 });

  function updatePos() {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = matchWidth ? Math.max(r.width, 220) : Math.max(r.width, 280);
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    if (left < 8) left = 8;
    let top = r.bottom + offset;
    const estimated = 320;
    if (top + estimated > window.innerHeight - 8 && r.top > estimated) {
      top = Math.max(8, r.top - estimated - offset);
    }
    setPos({ top, left, width });
  }

  useLayoutEffect(() => {
    if (!open) return;
    updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      onClose();
    }
    function onScroll() {
      updatePos();
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("resize", onScroll);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      className={className}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width: pos.width,
        right: "auto",
        bottom: "auto",
        insetInlineEnd: "auto",
        zIndex: 5000,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
