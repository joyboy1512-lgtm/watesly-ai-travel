"use client";

import { useEffect, useRef, useState } from "react";
import { shopFetch } from "@/lib/shop-session";

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
  onQuery: (q: string) => Promise<SuggestItem[]>;
  onPick: (item: SuggestItem) => void;
  onClearText: (text: string) => void;
};

export function ShopAutocomplete({
  label,
  value,
  display,
  placeholder,
  onQuery,
  onPick,
  onClearText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const boxRef = useRef<HTMLLabelElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function query(text: string) {
    onClearText(text);
    setOpen(true);
    try {
      setItems(await onQuery(text));
    } catch {
      setItems([]);
    }
  }

  return (
    <label className="fs-cell shop-ac" ref={boxRef}>
      <span>{label}</span>
      <input
        value={display || value}
        placeholder={placeholder}
        onChange={(e) => void query(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!items.length) void query(display || value);
        }}
      />
      {open && items.length ? (
        <div className="prc-suggest">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
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
      ) : null}
    </label>
  );
}
