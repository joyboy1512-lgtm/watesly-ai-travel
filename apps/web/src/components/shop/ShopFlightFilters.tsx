"use client";

import { useState } from "react";
import { formatMoneyMinor } from "@/lib/format";
import {
  DEPARTURE_BUCKETS,
  type FlightSearchFilters,
  type DepartureBucket,
} from "@/lib/flight-search";

type Facets = {
  stops: {
    any: number;
    direct: number;
    one: number;
    minAny: number;
    minDirect: number;
    minOne: number;
    currency: string;
  };
  airlines: Array<{
    code: string;
    name: string;
    count: number;
    minPrice: number;
    currency: string;
  }>;
  departureCounts: Record<DepartureBucket, number>;
  returnDepartureCounts: Record<DepartureBucket, number>;
  hasReturn: boolean;
  priceMaxMajor: number;
  durationMaxHours: number;
};

type Props = {
  filters: FlightSearchFilters;
  facets: Facets;
  originLabel?: string;
  destinationLabel?: string;
  onChange: (next: FlightSearchFilters) => void;
};

function moneyOrEmpty(minor: number, currency: string) {
  if (!Number.isFinite(minor) || minor >= Number.MAX_SAFE_INTEGER) return "";
  return `من ${formatMoneyMinor(minor, currency)}`;
}

export function ShopFlightFilters({
  filters,
  facets,
  originLabel = "المغادرة",
  destinationLabel = "الوجهة",
  onChange,
}: Props) {
  const [timeTab, setTimeTab] = useState<"depart" | "return">("depart");
  const durationValue = Number(filters.maxDurationHours) || facets.durationMaxHours;
  const priceValue = Number(filters.maxPrice) || facets.priceMaxMajor;

  function toggleBucket(
    field: "departureTimes" | "returnDepartureTimes",
    key: DepartureBucket,
  ) {
    const list = filters[field];
    const checked = list.includes(key);
    onChange({
      ...filters,
      [field]: checked ? list.filter((k) => k !== key) : [...list, key],
    });
  }

  function toggleAirline(code: string) {
    const checked = filters.airlines.includes(code);
    onChange({
      ...filters,
      airlines: checked
        ? filters.airlines.filter((c) => c !== code)
        : [...filters.airlines, code],
    });
  }

  const activeCounts =
    timeTab === "depart" ? facets.departureCounts : facets.returnDepartureCounts;
  const activeField = timeTab === "depart" ? "departureTimes" : "returnDepartureTimes";

  return (
    <aside className="shop-flight-filters-panel">
      <div className="shop-flight-filter-block">
        <strong>التوقفات</strong>
        <label className="shop-flight-filter-radio">
          <em>{moneyOrEmpty(facets.stops.minAny, facets.stops.currency)}</em>
          <span>الكل ({facets.stops.any})</span>
          <input
            type="radio"
            name="shop-stops"
            checked={filters.stops === "any"}
            onChange={() => onChange({ ...filters, stops: "any" })}
          />
        </label>
        <label className="shop-flight-filter-radio">
          <em>{moneyOrEmpty(facets.stops.minDirect, facets.stops.currency)}</em>
          <span>مباشر فقط ({facets.stops.direct})</span>
          <input
            type="radio"
            name="shop-stops"
            checked={filters.stops === "0"}
            onChange={() => onChange({ ...filters, stops: "0" })}
          />
        </label>
        <label className="shop-flight-filter-radio">
          <em>{moneyOrEmpty(facets.stops.minOne, facets.stops.currency)}</em>
          <span>توقف واحد كحد أقصى ({facets.stops.one})</span>
          <input
            type="radio"
            name="shop-stops"
            checked={filters.stops === "1"}
            onChange={() => onChange({ ...filters, stops: "1" })}
          />
        </label>
      </div>

      <div className="shop-flight-filter-block">
        <strong>شركات الطيران</strong>
        {facets.airlines.map((a) => {
          const checked = filters.airlines.includes(a.code);
          return (
            <label key={a.code} className="shop-flight-filter-check">
              <em>{moneyOrEmpty(a.minPrice, a.currency)}</em>
              <span>
                {a.name} ({a.count})
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleAirline(a.code)}
              />
            </label>
          );
        })}
        {!facets.airlines.length ? <small>لا توجد شركات في النتائج</small> : null}
      </div>

      <div className="shop-flight-filter-block">
        <strong>أوقات الرحلة</strong>
        {facets.hasReturn ? (
          <div className="shop-flight-time-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              className={timeTab === "depart" ? "on" : undefined}
              aria-selected={timeTab === "depart"}
              onClick={() => setTimeTab("depart")}
            >
              رحلة الذهاب
            </button>
            <button
              type="button"
              role="tab"
              className={timeTab === "return" ? "on" : undefined}
              aria-selected={timeTab === "return"}
              onClick={() => setTimeTab("return")}
            >
              رحلة العودة
            </button>
          </div>
        ) : null}
        <p className="shop-flight-time-hint">
          تغادر من {timeTab === "depart" ? originLabel : destinationLabel}
        </p>
        {DEPARTURE_BUCKETS.map((bucket) => {
          const checked = filters[activeField].includes(bucket.key);
          const count = activeCounts[bucket.key] || 0;
          return (
            <label key={`${activeField}-${bucket.key}`} className="shop-flight-filter-check">
              <em>{bucket.hint}</em>
              <span>
                {bucket.label} ({count})
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleBucket(activeField, bucket.key)}
              />
            </label>
          );
        })}
      </div>

      <div className="shop-flight-filter-block">
        <strong>المدة القصوى</strong>
        <input
          type="range"
          min={2}
          max={Math.max(facets.durationMaxHours, 8)}
          value={durationValue}
          onChange={(e) =>
            onChange({
              ...filters,
              maxDurationHours:
                Number(e.target.value) >= facets.durationMaxHours ? "" : e.target.value,
            })
          }
        />
        <small>حتى {durationValue} ساعة</small>
      </div>

      <div className="shop-flight-filter-block">
        <strong>السعر</strong>
        <input
          type="range"
          min={10}
          max={Math.max(facets.priceMaxMajor, 50)}
          value={priceValue}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice:
                Number(e.target.value) >= facets.priceMaxMajor ? "" : e.target.value,
            })
          }
        />
        <small>
          حتى {priceValue} {facets.stops.currency} للبالغ
        </small>
      </div>
    </aside>
  );
}
