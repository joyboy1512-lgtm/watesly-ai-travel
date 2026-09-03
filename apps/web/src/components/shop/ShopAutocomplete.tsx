"use client";

import { useEffect, useRef, useState } from "react";

export type SuggestItem = {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
};

type Props = {
  label: string;
  value: string;
  display: string;
  placeholder?: string;
  inline?: boolean;
  /** Minimum characters before calling onQuery (default 2). Empty focus still opens popular/empty. */
  minChars?: number;
  debounceMs?: number;
  onQuery: (q: string) => Promise<SuggestItem[]>;
  onPick: (item: SuggestItem) => void;
  onClearText: (text: string) => void;
};

export function ShopAutocomplete({
  label,
  value,
  display,
  placeholder,
  inline = false,
  minChars = 2,
  debounceMs = 280,
  onQuery,
  onPick,
  onClearText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const onQueryRef = useRef(onQuery);
  onQueryRef.current = onQuery;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  function scheduleQuery(text: string, immediate = false) {
    onClearText(text);
    setOpen(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const trimmed = text.trim();
    if (trimmed.length > 0 && trimmed.length < minChars) {
      setItems([]);
      return;
    }

    const run = async () => {
      const seq = ++seqRef.current;
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const next = await onQueryRef.current(trimmed);
        if (ac.signal.aborted || seq !== seqRef.current) return;
        setItems(next);
      } catch {
        if (ac.signal.aborted || seq !== seqRef.current) return;
        setItems([]);
      }
    };

    if (immediate) {
      void run();
      return;
    }
    timerRef.current = setTimeout(() => {
      void run();
    }, debounceMs);
  }

  const menu =
    open && items.length ? (
      <div className="prc-suggest exp-ac-menu" role="listbox">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="option"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              onPick(item);
              setOpen(false);
            }}
          >
            <strong>{item.title}</strong>
            {item.subtitle ? <span>{item.subtitle}</span> : null}
          </button>
        ))}
      </div>
    ) : null;

  if (inline) {
    return (
      <div className="shop-ac shop-ac-inline exp-ac-field" ref={boxRef}>
        <span className="exp-cell-label">{label}</span>
        <input
          type="text"
          value={display || value}
          placeholder={placeholder}
          onChange={(e) => scheduleQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            scheduleQuery(display || value || "", true);
          }}
          autoComplete="off"
        />
        {menu}
      </div>
    );
  }

  return (
    <label className="fs-cell shop-ac" ref={boxRef as never}>
      <span>{label}</span>
      <input
        type="text"
        value={display || value}
        placeholder={placeholder}
        onChange={(e) => scheduleQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!items.length) scheduleQuery(display || value || "", true);
        }}
        autoComplete="off"
      />
      {menu}
    </label>
  );
}
