"use client";

import { useState, type ReactNode } from "react";
import {
  BOARD_LABELS_AR,
  type HotelFilterFacets,
  type HotelSearchFilters,
} from "@/lib/hotel-search";

type Props = {
  filters: HotelSearchFilters;
  facets: HotelFilterFacets;
  onChange: (next: HotelSearchFilters) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
};

function toggleList(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((v) => v !== id) : [...values, id];
}

function FilterSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="shop-hotel-filter-block">
      <strong>{title}</strong>
      {subtitle ? <p className="shop-hotel-filter-sub">{subtitle}</p> : null}
      {children}
    </div>
  );
}

function FilterCheck({
  id,
  label,
  count,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <label className="shop-hotel-filter-check shop-hotel-filter-row">
      {count != null ? <span className="shop-hotel-filter-count">{count}</span> : <span />}
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={() => onToggle(id)} />
    </label>
  );
}

function FilterRadio({
  name,
  id,
  label,
  count,
  checked,
  onSelect,
}: {
  name: string;
  id: string;
  label: string;
  count?: number;
  checked: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label className="shop-hotel-filter-radio shop-hotel-filter-row">
      {count != null ? <span className="shop-hotel-filter-count">{count}</span> : <span />}
      <span>{label}</span>
      <input type="radio" name={name} checked={checked} onChange={() => onSelect(id)} />
    </label>
  );
}

function ExpandableChecks({
  name,
  options,
  selected,
  onToggle,
  initial = 5,
}: {
  name: string;
  options: Array<{ id: string; label: string; count: number }>;
  selected: string[];
  onToggle: (id: string) => void;
  initial?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!options.length) return null;
  const visible = expanded ? options : options.slice(0, initial);
  return (
    <>
      {visible.map((option) => (
        <FilterCheck
          key={`${name}-${option.id}`}
          id={option.id}
          label={option.label}
          count={option.count}
          checked={selected.includes(option.id)}
          onToggle={onToggle}
        />
      ))}
      {options.length > initial ? (
        <button
          type="button"
          className="shop-hotel-filter-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "عرض أقل" : `اعرض الـ ${options.length} جميعها`}
        </button>
      ) : null}
    </>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="shop-hotel-filter-stepper">
      <span>{label}</span>
      <div className="exp-stepper">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
          −
        </button>
        <strong>{value}</strong>
        <button type="button" onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

function FiltersPanel({
  filters,
  facets,
  onChange,
}: {
  filters: HotelSearchFilters;
  facets: HotelFilterFacets;
  onChange: (next: HotelSearchFilters) => void;
}) {
  return (
    <aside className="shop-hotel-filters-panel">
      <h3 className="shop-hotel-filters-title">تصفية حسب:</h3>

      <FilterSection title="ابحث في النتائج">
        <input
          type="search"
          value={filters.hotelQuery}
          onChange={(e) => onChange({ ...filters, hotelQuery: e.target.value })}
          placeholder="مثال: أريد مكاناً لديه تقييمات رائعة وإلغاء مجاني"
        />
      </FilterSection>

      {facets.meals.length ? (
        <FilterSection title="الوجبات">
          <ExpandableChecks
            name="meals"
            options={facets.meals}
            selected={filters.mealTypes || []}
            onToggle={(id) =>
              onChange({
                ...filters,
                mealTypes: toggleList(filters.mealTypes || [], id),
                breakfast:
                  id === "BB"
                    ? !(filters.mealTypes || []).includes("BB")
                    : filters.breakfast,
              })
            }
          />
        </FilterSection>
      ) : null}

      {facets.propertyTypes.length ? (
        <FilterSection title="نوع مكان الإقامة">
          <ExpandableChecks
            name="propertyTypes"
            options={facets.propertyTypes}
            selected={filters.propertyTypes}
            onToggle={(id) =>
              onChange({ ...filters, propertyTypes: toggleList(filters.propertyTypes, id) })
            }
          />
        </FilterSection>
      ) : null}

      <FilterSection title="غرف النوم والحمامات">
        <Stepper
          label="غرف النوم"
          value={filters.minBedrooms || 0}
          onChange={(n) => onChange({ ...filters, minBedrooms: n })}
        />
        <Stepper
          label="الحمامات"
          value={filters.minBathrooms || 0}
          onChange={(n) => onChange({ ...filters, minBathrooms: n })}
        />
      </FilterSection>

      {facets.facilities.length ? (
        <FilterSection title="المرافق">
          <ExpandableChecks
            name="facilities"
            options={facets.facilities}
            selected={filters.facilities}
            onToggle={(id) =>
              onChange({ ...filters, facilities: toggleList(filters.facilities, id) })
            }
          />
        </FilterSection>
      ) : null}

      {facets.roomFacilities.length ? (
        <FilterSection title="مرافق الغرفة">
          <ExpandableChecks
            name="roomFacilities"
            options={facets.roomFacilities}
            selected={filters.roomFacilities || []}
            onToggle={(id) =>
              onChange({
                ...filters,
                roomFacilities: toggleList(filters.roomFacilities || [], id),
              })
            }
          />
        </FilterSection>
      ) : null}

      {facets.starRatings.length ? (
        <FilterSection
          title="تصنيف مكان الإقامة"
          subtitle="اعثر على فنادق وبيوت عطلات بجودة عالية"
        >
          <ExpandableChecks
            name="starRatings"
            options={facets.starRatings}
            selected={filters.starRatings || []}
            onToggle={(id) =>
              onChange({ ...filters, starRatings: toggleList(filters.starRatings || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {facets.zonesWithCounts.length ? (
        <FilterSection title="المنطقة">
          <FilterRadio
            name="shopZone"
            id=""
            label="الكل"
            checked={!filters.zone}
            onSelect={() => onChange({ ...filters, zone: "" })}
          />
          <ExpandableChecks
            name="zones"
            options={facets.zonesWithCounts}
            selected={filters.zone ? [filters.zone] : []}
            onToggle={(id) => onChange({ ...filters, zone: filters.zone === id ? "" : id })}
          />
        </FilterSection>
      ) : null}

      {facets.bedTypes.length ? (
        <FilterSection title="تفضيل السرير">
          <ExpandableChecks
            name="bedTypes"
            options={facets.bedTypes}
            selected={filters.bedTypes || []}
            onToggle={(id) =>
              onChange({ ...filters, bedTypes: toggleList(filters.bedTypes || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {facets.reviewScores.length ? (
        <FilterSection title="نقاط التقييم">
          <FilterRadio
            name="shopMinReview"
            id="any"
            label="الكل"
            checked={filters.minReviewScore === "any"}
            onSelect={() => onChange({ ...filters, minReviewScore: "any" })}
          />
          {facets.reviewScores.map((option) => (
            <FilterRadio
              key={option.id}
              name="shopMinReview"
              id={option.id}
              label={option.label}
              count={option.count}
              checked={filters.minReviewScore === option.id}
              onSelect={(id) =>
                onChange({
                  ...filters,
                  minReviewScore: id as HotelSearchFilters["minReviewScore"],
                })
              }
            />
          ))}
        </FilterSection>
      ) : null}

      {facets.distances.length ? (
        <FilterSection title="المسافة من وسط المدينة">
          <FilterRadio
            name="shopDistance"
            id=""
            label="الكل"
            checked={!filters.maxDistanceKm}
            onSelect={() => onChange({ ...filters, maxDistanceKm: "" })}
          />
          {facets.distances.map((option) => (
            <FilterRadio
              key={option.id}
              name="shopDistance"
              id={option.id}
              label={option.label}
              count={option.count}
              checked={filters.maxDistanceKm === option.id}
              onSelect={(id) => onChange({ ...filters, maxDistanceKm: id })}
            />
          ))}
        </FilterSection>
      ) : null}

      <FilterSection title="سياسة الحجز">
        {facets.bookingPolicies.noPrepayment ? (
          <FilterCheck
            id="noPrepayment"
            label="بدون دفعة مسبقة"
            count={facets.bookingPolicies.noPrepayment}
            checked={filters.noPrepayment}
            onToggle={() => onChange({ ...filters, noPrepayment: !filters.noPrepayment })}
          />
        ) : null}
        {facets.bookingPolicies.freeCancellation ? (
          <FilterCheck
            id="freeCancellation"
            label="إلغاء مجاني"
            count={facets.bookingPolicies.freeCancellation}
            checked={filters.freeCancellation}
            onToggle={() => onChange({ ...filters, freeCancellation: !filters.freeCancellation })}
          />
        ) : null}
        {facets.bookingPolicies.onlinePayment ? (
          <FilterCheck
            id="onlinePayment"
            label="يوفر خيار الدفع عبر الإنترنت"
            count={facets.bookingPolicies.onlinePayment}
            checked={Boolean(filters.onlinePayment)}
            onToggle={() => onChange({ ...filters, onlinePayment: !filters.onlinePayment })}
          />
        ) : null}
        {facets.bookingPolicies.bookableOnly ? (
          <FilterCheck
            id="bookableOnly"
            label="متاح للحجز فقط"
            count={facets.bookingPolicies.bookableOnly}
            checked={filters.bookableOnly}
            onToggle={() => onChange({ ...filters, bookableOnly: !filters.bookableOnly })}
          />
        ) : null}
      </FilterSection>

      {facets.brands.length ? (
        <FilterSection title="علامات تجارية فندقية">
          <ExpandableChecks
            name="brands"
            options={facets.brands}
            selected={filters.brands || []}
            onToggle={(id) => onChange({ ...filters, brands: toggleList(filters.brands || [], id) })}
            initial={8}
          />
        </FilterSection>
      ) : null}

      {facets.landmarks.length ? (
        <FilterSection title="المعالم">
          <ExpandableChecks
            name="landmarks"
            options={facets.landmarks}
            selected={filters.landmarks || []}
            onToggle={(id) =>
              onChange({ ...filters, landmarks: toggleList(filters.landmarks || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {facets.breakfastIncluded ? (
        <FilterSection title="ميزات ذات تقييم عالٍ" subtitle="بناءً على تقييمات الضيوف">
          <FilterCheck
            id="breakfast"
            label="إفطار جيد جداً"
            count={facets.breakfastIncluded}
            checked={filters.breakfast}
            onToggle={() => onChange({ ...filters, breakfast: !filters.breakfast })}
          />
        </FilterSection>
      ) : null}

      {facets.boardCodes.length ? (
        <FilterSection title="نوع الوجبات (تعرفة)">
          <FilterRadio
            name="shopBoardCode"
            id=""
            label="كل أنواع الوجبات"
            checked={!filters.boardCode}
            onSelect={() => onChange({ ...filters, boardCode: "", board: "" })}
          />
          {facets.boardCodes.map((code) => (
            <FilterRadio
              key={code}
              name="shopBoardCode"
              id={code}
              label={BOARD_LABELS_AR[code as keyof typeof BOARD_LABELS_AR] || code}
              checked={filters.boardCode === code}
              onSelect={(id) =>
                onChange({
                  ...filters,
                  boardCode: id,
                  board: BOARD_LABELS_AR[id as keyof typeof BOARD_LABELS_AR] || id,
                })
              }
            />
          ))}
        </FilterSection>
      ) : null}

      <FilterSection title="السعر الأقصى (د.ك)">
        <input
          type="number"
          min={0}
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          placeholder="مثال: 250"
        />
      </FilterSection>
    </aside>
  );
}

export function ShopHotelFilters({
  filters,
  facets,
  onChange,
  mobileOpen,
  onMobileToggle,
}: Props) {
  return (
    <div className="shop-hotel-filters">
      <button
        type="button"
        className="shop-hotel-filters-mobile-toggle"
        onClick={onMobileToggle}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? "إخفاء التصفية" : "تصفية"}
      </button>
      <div className={`shop-hotel-filters-drawer${mobileOpen ? " open" : ""}`}>
        <FiltersPanel filters={filters} facets={facets} onChange={onChange} />
      </div>
      <div className="shop-hotel-filters-desktop">
        <FiltersPanel filters={filters} facets={facets} onChange={onChange} />
      </div>
    </div>
  );
}
