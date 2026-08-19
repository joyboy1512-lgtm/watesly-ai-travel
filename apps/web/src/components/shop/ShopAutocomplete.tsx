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
  onQuery,
  onPick,
  onClearText,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SuggestItem[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function runQuery(text: string) {
    onClearText(text);
    setOpen(true);
    try {
      setItems(await onQuery(text));
    } catch {
      setItems([]);
    }
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
        <span className="exp-field-label">{label}</span>
        <input
          type="text"
          value={display || value}
          placeholder={placeholder}
          onChange={(e) => void runQuery(e.target.value)}
          onFocus={() => {
            setOpen(true);
            void runQuery(display || value || "");
          }}
          autoComplete="off"
        />
        {menu}
      </div>
    );
  }

  return (
    <label className="fs-cell shop-ac">
      <span>{label}</span>
      <input
        type="text"
        value={display || value}
        placeholder={placeholder}
        onChange={(e) => void runQuery(e.target.value)}
        onFocus={() => {
          setOpen(true);
          if (!items.length) void runQuery(display || value);
        }}
        autoComplete="off"
      />
      {menu}
    </label>
  );
}
