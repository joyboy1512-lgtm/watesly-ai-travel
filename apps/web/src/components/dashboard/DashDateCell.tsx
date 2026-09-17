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

export function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function DashDateCell({
  label,
  value,
  onChange,
  hint,
  min,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  min?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const floor = min || todayIsoDate();

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    try {
      const picker = (
        el as HTMLInputElement & { showPicker?: () => void }
      ).showPicker;
      if (typeof picker === "function") picker.call(el);
      else el.focus();
    } catch {
      el.focus();
    }
  }

  return (
    <label
      className={`fs-cell fs-date-cell${className ? ` ${className}` : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).tagName !== "INPUT") openPicker();
      }}
    >
      <span>{label}</span>
      <input
        ref={inputRef}
        type="date"
        min={floor}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next && next < floor) return;
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
        zIndex: 5000,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
