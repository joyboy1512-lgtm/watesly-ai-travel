"use client";

type Props = {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
};

export function ShopPriceRangeSlider({ min, max, value, onChange, label }: Props) {
  const safeMax = Math.max(min + 1, max);
  const current = value > 0 ? Math.min(value, safeMax) : safeMax;

  return (
    <div className="shop-price-range">
      {label ? <strong>{label}</strong> : null}
      <div className="shop-price-range-values">
        <span>{min} د.ك</span>
        <span className="shop-price-range-current">
          حتى {current >= safeMax ? `${safeMax}+` : current} د.ك
        </span>
      </div>
      <input
        type="range"
        className="shop-price-range-input"
        min={min}
        max={safeMax}
        step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
