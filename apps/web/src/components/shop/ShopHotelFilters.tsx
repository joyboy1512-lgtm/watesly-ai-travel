"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ShopPriceRangeSlider } from "@/components/shop/ShopPriceRangeSlider";
import {
  countHotelFilters,
  defaultHotelFilters,
  type HotelFilterFacets,
  type HotelSearchFilters,
} from "@/lib/hotel-search";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { shopFilterOptionLabel } from "@watesly-travel/shared";

type Props = {
  filters: HotelSearchFilters;
  facets: HotelFilterFacets;
  onChange: (next: HotelSearchFilters) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
  /** e.g. DXB — enables "داخل الوجهة فقط" filter */
  searchDestinationCode?: string;
  searchDestinationLabel?: string;
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
      <span className="shop-hotel-filter-count">{count ?? ""}</span>
      <span className="shop-hotel-filter-label">{label}</span>
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
      <span className="shop-hotel-filter-count">{count ?? ""}</span>
      <span className="shop-hotel-filter-label">{label}</span>
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
  const { t } = useShopI18n();
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
          {expanded ? t("showLess") : t("showAllN", { n: options.length })}
        </button>
      ) : null}
    </>
  );
}


function FiltersPanel({
  filters,
  facets,
  onChange,
  searchDestinationCode,
  searchDestinationLabel,
}: {
  filters: HotelSearchFilters;
  facets: HotelFilterFacets;
  onChange: (next: HotelSearchFilters) => void;
  searchDestinationCode?: string;
  searchDestinationLabel?: string;
}) {
  const { t, locale } = useShopI18n();
  const facilityOptions = facets.facilities || [];
  const mealOptions = facets.meals || [];
  const roomFacilityOptions = facets.roomFacilities || [];
  const landmarkOptions = facets.landmarks || [];
  const brandOptions = facets.brands || [];
  const bedTypeOptions = facets.bedTypes || [];
  const hasGuestReviews = (facets.reviewScores || []).some((o) => o.count > 0);
  const destCode = (searchDestinationCode || "").trim().toUpperCase();
  const destLabel = searchDestinationLabel || destCode;
  const popularPool = facilityOptions.find((o) => o.id === "pool");
  const popularWifi = facilityOptions.find((o) => o.id === "wifi");

  return (
    <aside className="shop-hotel-filters-panel">
      <div className="shop-hotel-filters-title-row">
        <h3 className="shop-hotel-filters-title">{t("filterBy")}</h3>
        <button
          type="button"
          className="shop-hotel-filters-clear"
          onClick={() => onChange(defaultHotelFilters())}
        >
          {t("clearAll")}
        </button>
      </div>

      <FilterSection title={t("hotelNameFilter")}>
        <input
          type="search"
          className="shop-hotel-filter-search"
          value={filters.hotelQuery}
          placeholder={t("hotelNamePlaceholder")}
          onChange={(e) => onChange({ ...filters, hotelQuery: e.target.value })}
        />
      </FilterSection>

      <FilterSection title={t("popularFilters")}>
        {facets.bookingPolicies?.freeCancellation ? (
          <FilterCheck
            id="popular-freeCancellation"
            label={t("freeCancel")}
            count={facets.bookingPolicies.freeCancellation}
            checked={filters.freeCancellation}
            onToggle={() =>
              onChange({ ...filters, freeCancellation: !filters.freeCancellation })
            }
          />
        ) : null}
        {facets.breakfastIncluded ? (
          <FilterCheck
            id="popular-breakfast"
            label={t("breakfastIncl")}
            count={facets.breakfastIncluded}
            checked={filters.breakfast}
            onToggle={() => onChange({ ...filters, breakfast: !filters.breakfast })}
          />
        ) : null}
        {facets.bookingPolicies?.noPrepayment ? (
          <FilterCheck
            id="popular-noPrepayment"
            label={t("payAtHotelOpt")}
            count={facets.bookingPolicies.noPrepayment}
            checked={filters.noPrepayment}
            onToggle={() => onChange({ ...filters, noPrepayment: !filters.noPrepayment })}
          />
        ) : null}
        {(facets.starRatings || []).some((o) => Number(o.id) >= 4) ? (
          <FilterCheck
            id="popular-stars4"
            label={shopFilterOptionLabel(locale, "4", "4+", "star")}
            checked={(filters.starRatings || []).includes("4") || (filters.starRatings || []).includes("5")}
            onToggle={() => {
              const current = filters.starRatings || [];
              const has = current.includes("4") || current.includes("5");
              onChange({
                ...filters,
                starRatings: has
                  ? current.filter((id) => id !== "4" && id !== "5")
                  : [...new Set([...current, "4", "5"])],
              });
            }}
          />
        ) : null}
        {popularPool ? (
          <FilterCheck
            id="popular-pool"
            label={shopFilterOptionLabel(locale, popularPool.id, popularPool.label, "facility")}
            count={popularPool.count}
            checked={(filters.facilities || []).includes("pool")}
            onToggle={() =>
              onChange({ ...filters, facilities: toggleList(filters.facilities || [], "pool") })
            }
          />
        ) : null}
        {popularWifi ? (
          <FilterCheck
            id="popular-wifi"
            label={shopFilterOptionLabel(locale, popularWifi.id, popularWifi.label, "facility")}
            count={popularWifi.count}
            checked={(filters.facilities || []).includes("wifi")}
            onToggle={() =>
              onChange({ ...filters, facilities: toggleList(filters.facilities || [], "wifi") })
            }
          />
        ) : null}
      </FilterSection>

      {destCode ? (
        <FilterSection title={t("city")}>
          <FilterCheck
            id="destinationOnly"
            label={t("insideOnly", { name: destLabel })}
            checked={filters.destinationCodeOnly === destCode}
            onToggle={() =>
              onChange({
                ...filters,
                destinationCodeOnly:
                  filters.destinationCodeOnly === destCode ? "" : destCode,
              })
            }
          />
        </FilterSection>
      ) : null}

      {(facets.priceMaxPerNightMajor || facets.priceMaxMajor) > 0 ? (
        <FilterSection title={t("pricePerRoomNight")}>
          <ShopPriceRangeSlider
            min={0}
            max={facets.priceMaxPerNightMajor || facets.priceMaxMajor}
            value={
              filters.maxPricePerNight
                ? Number(filters.maxPricePerNight)
                : facets.priceMaxPerNightMajor || facets.priceMaxMajor
            }
            onChange={(v) => {
              const cap = facets.priceMaxPerNightMajor || facets.priceMaxMajor;
              onChange({
                ...filters,
                maxPricePerNight: v >= cap ? "" : String(v),
              });
            }}
          />
        </FilterSection>
      ) : null}

      {(facets.starRatings || []).length ? (
        <FilterSection title={t("stars")}>
          <ExpandableChecks
            name="starRatings"
            options={(facets.starRatings || []).map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "star"),
            }))}
            selected={filters.starRatings || []}
            onToggle={(id) =>
              onChange({
                ...filters,
                starRatings: toggleList(filters.starRatings || [], id),
              })
            }
          />
        </FilterSection>
      ) : null}

      {(facets.zonesWithCounts || []).length ? (
        <FilterSection title={t("area")}>
          <FilterRadio
            name="shopZone"
            id=""
            label={t("all")}
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

      {(facets.distances || []).length ? (
        <FilterSection title={t("distanceCenter")}>
          <FilterRadio
            name="shopDistance"
            id=""
            label={t("all")}
            checked={!filters.maxDistanceKm}
            onSelect={() => onChange({ ...filters, maxDistanceKm: "" })}
          />
          {facets.distances.map((option) => (
            <FilterRadio
              key={option.id}
              name="shopDistance"
              id={option.id}
              label={shopFilterOptionLabel(locale, option.id, option.label, "distance")}
              count={option.count}
              checked={filters.maxDistanceKm === option.id}
              onSelect={(id) => onChange({ ...filters, maxDistanceKm: id })}
            />
          ))}
        </FilterSection>
      ) : null}

      {mealOptions.length ? (
        <FilterSection title={t("meals")}>
          <ExpandableChecks
            name="mealTypes"
            options={mealOptions.map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "meal"),
            }))}
            selected={filters.mealTypes || []}
            onToggle={(id) =>
              onChange({
                ...filters,
                mealTypes: toggleList(filters.mealTypes || [], id),
              })
            }
          />
        </FilterSection>
      ) : facets.breakfastIncluded ? (
        <FilterSection title={t("breakfast")}>
          <FilterCheck
            id="breakfast"
            label={t("breakfastIncl")}
            count={facets.breakfastIncluded}
            checked={filters.breakfast}
            onToggle={() => onChange({ ...filters, breakfast: !filters.breakfast })}
          />
        </FilterSection>
      ) : null}

      {facets.bookingPolicies?.freeCancellation ||
      facets.bookingPolicies?.noPrepayment ||
      facets.bookingPolicies?.onlinePayment ||
      facets.bookingPolicies?.bookableOnly ? (
        <FilterSection title={t("bookingPayPolicy")}>
          {facets.bookingPolicies.freeCancellation ? (
            <FilterCheck
              id="freeCancellation"
              label={t("freeCancel")}
              count={facets.bookingPolicies.freeCancellation}
              checked={filters.freeCancellation}
              onToggle={() =>
                onChange({ ...filters, freeCancellation: !filters.freeCancellation })
              }
            />
          ) : null}
          {facets.bookingPolicies.noPrepayment ? (
            <FilterCheck
              id="noPrepayment"
              label={t("payAtHotelOpt")}
              count={facets.bookingPolicies.noPrepayment}
              checked={filters.noPrepayment}
              onToggle={() => onChange({ ...filters, noPrepayment: !filters.noPrepayment })}
            />
          ) : null}
          {facets.bookingPolicies.onlinePayment ? (
            <FilterCheck
              id="onlinePayment"
              label={t("payOnlineNow")}
              count={facets.bookingPolicies.onlinePayment}
              checked={Boolean(filters.onlinePayment)}
              onToggle={() =>
                onChange({ ...filters, onlinePayment: !filters.onlinePayment })
              }
            />
          ) : null}
          {facets.bookingPolicies.bookableOnly ? (
            <FilterCheck
              id="bookableOnly"
              label={t("bookableOnly")}
              count={facets.bookingPolicies.bookableOnly}
              checked={filters.bookableOnly}
              onToggle={() => onChange({ ...filters, bookableOnly: !filters.bookableOnly })}
            />
          ) : null}
        </FilterSection>
      ) : null}

      {(facets.propertyTypes || []).length ? (
        <FilterSection title={t("propertyType")}>
          <ExpandableChecks
            name="propertyTypes"
            options={(facets.propertyTypes || []).map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "property"),
            }))}
            selected={filters.propertyTypes}
            onToggle={(id) =>
              onChange({
                ...filters,
                propertyTypes: toggleList(filters.propertyTypes, id),
              })
            }
          />
        </FilterSection>
      ) : null}

      {facilityOptions.length ? (
        <FilterSection title={t("facilities")}>
          <ExpandableChecks
            name="facilities"
            options={facilityOptions.map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "facility"),
            }))}
            selected={filters.facilities}
            onToggle={(id) =>
              onChange({ ...filters, facilities: toggleList(filters.facilities, id) })
            }
            initial={8}
          />
        </FilterSection>
      ) : null}

      {roomFacilityOptions.length ? (
        <FilterSection title={t("roomFacilities")}>
          <ExpandableChecks
            name="roomFacilities"
            options={roomFacilityOptions.map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "room"),
            }))}
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

      {landmarkOptions.length ? (
        <FilterSection title={t("landmarks")}>
          <ExpandableChecks
            name="landmarks"
            options={landmarkOptions}
            selected={filters.landmarks || []}
            onToggle={(id) =>
              onChange({ ...filters, landmarks: toggleList(filters.landmarks || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {bedTypeOptions.length ? (
        <FilterSection title={t("bedType")}>
          <ExpandableChecks
            name="bedTypes"
            options={bedTypeOptions.map((o) => ({
              ...o,
              label: shopFilterOptionLabel(locale, o.id, o.label, "bed"),
            }))}
            selected={filters.bedTypes || []}
            onToggle={(id) =>
              onChange({ ...filters, bedTypes: toggleList(filters.bedTypes || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {brandOptions.length ? (
        <FilterSection title={t("hotelBrand")}>
          <ExpandableChecks
            name="brands"
            options={brandOptions}
            selected={filters.brands || []}
            onToggle={(id) =>
              onChange({ ...filters, brands: toggleList(filters.brands || [], id) })
            }
          />
        </FilterSection>
      ) : null}

      {hasGuestReviews ? (
        <FilterSection title={t("guestRating")}>
          <FilterRadio
            name="shopMinReview"
            id="any"
            label={t("all")}
            checked={filters.minReviewScore === "any"}
            onSelect={() => onChange({ ...filters, minReviewScore: "any" })}
          />
          {facets.reviewScores.map((option) => (
            <FilterRadio
              key={option.id}
              name="shopMinReview"
              id={option.id}
              label={shopFilterOptionLabel(locale, option.id, option.label, "review")}
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
    </aside>
  );
}

export function ShopHotelFilters({
  filters,
  facets,
  onChange,
  mobileOpen,
  onMobileToggle,
  searchDestinationCode,
  searchDestinationLabel,
}: Props) {
  const { t } = useShopI18n();
  const filterCount = countHotelFilters(filters);
  return (
    <div className="shop-hotel-filters">
      {mobileOpen ? (
        <button
          type="button"
          className="shop-filters-sheet-backdrop"
          aria-label={t("closeFilters")}
          onClick={onMobileToggle}
        />
      ) : null}
      <button
        type="button"
        className="shop-hotel-filters-mobile-toggle"
        onClick={onMobileToggle}
        aria-expanded={mobileOpen}
      >
        {mobileOpen ? t("hideFilters") : t("filters")}
        {filterCount > 0 ? (
          <span className="shop-filters-count-badge">{filterCount}</span>
        ) : null}
      </button>
      <div className={`shop-hotel-filters-drawer shop-filters-sheet${mobileOpen ? " open" : ""}`}>
        <div className="shop-filters-sheet-head">
          <strong>{t("filters")}</strong>
          <button type="button" onClick={onMobileToggle}>
            {t("done")}
          </button>
        </div>
        <FiltersPanel
          filters={filters}
          facets={facets}
          onChange={onChange}
          searchDestinationCode={searchDestinationCode}
          searchDestinationLabel={searchDestinationLabel}
        />
      </div>
      <div className="shop-hotel-filters-desktop">
        <FiltersPanel
          filters={filters}
          facets={facets}
          onChange={onChange}
          searchDestinationCode={searchDestinationCode}
          searchDestinationLabel={searchDestinationLabel}
        />
      </div>
    </div>
  );
}
