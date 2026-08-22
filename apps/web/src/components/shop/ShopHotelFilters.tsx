"use client";

import {
  BOARD_LABELS_AR,
  type HotelSearchFilters,
} from "@/lib/hotel-search";

type Facets = {
  boardCodes: string[];
  zones: string[];
  paymentTypes: string[];
  rateTypes: string[];
};

type Props = {
  filters: HotelSearchFilters;
  facets: Facets;
  onChange: (next: HotelSearchFilters) => void;
  mobileOpen: boolean;
  onMobileToggle: () => void;
};

export function ShopHotelFilters({
  filters,
  facets,
  onChange,
  mobileOpen,
  onMobileToggle,
}: Props) {
  const panel = (
    <aside className="shop-hotel-filters-panel">
      <h3 className="shop-hotel-filters-title">تصفية النتائج</h3>

      <div className="shop-hotel-filter-block">
        <strong>ابحث في النتائج</strong>
        <input
          type="search"
          value={filters.hotelQuery}
          onChange={(e) => onChange({ ...filters, hotelQuery: e.target.value })}
          placeholder="اسم فندق أو منطقة"
        />
      </div>

      <div className="shop-hotel-filter-block">
        <strong>التصنيف بالنجوم</strong>
        <label className="shop-hotel-filter-radio">
          <input
            type="radio"
            name="shopMinStars"
            checked={filters.minStars === "any"}
            onChange={() => onChange({ ...filters, minStars: "any" })}
          />
          <span>الكل</span>
        </label>
        {(["3", "4", "5"] as const).map((s) => (
          <label key={s} className="shop-hotel-filter-radio">
            <input
              type="radio"
              name="shopMinStars"
              checked={filters.minStars === s}
              onChange={() => onChange({ ...filters, minStars: s })}
            />
            <span>{s} نجوم فأكثر</span>
          </label>
        ))}
      </div>

      <div className="shop-hotel-filter-block">
        <strong>تقييم الضيوف</strong>
        <label className="shop-hotel-filter-radio">
          <input
            type="radio"
            name="shopMinReview"
            checked={filters.minReviewScore === "any"}
            onChange={() => onChange({ ...filters, minReviewScore: "any" })}
          />
          <span>الكل</span>
        </label>
        {(["7", "8", "9"] as const).map((s) => (
          <label key={s} className="shop-hotel-filter-radio">
            <input
              type="radio"
              name="shopMinReview"
              checked={filters.minReviewScore === s}
              onChange={() => onChange({ ...filters, minReviewScore: s })}
            />
            <span>{s}+ ممتاز</span>
          </label>
        ))}
      </div>

      <div className="shop-hotel-filter-block">
        <strong>الوجبات</strong>
        <label className="shop-hotel-filter-check">
          <input
            type="checkbox"
            checked={filters.breakfast}
            onChange={(e) => onChange({ ...filters, breakfast: e.target.checked })}
          />
          <span>يشمل الإفطار</span>
        </label>
        <label className="shop-hotel-filter-radio">
          <input
            type="radio"
            name="shopBoardCode"
            checked={!filters.boardCode}
            onChange={() => onChange({ ...filters, boardCode: "", board: "" })}
          />
          <span>كل أنواع الوجبات</span>
        </label>
        {facets.boardCodes.map((code) => (
          <label key={code} className="shop-hotel-filter-radio">
            <input
              type="radio"
              name="shopBoardCode"
              checked={filters.boardCode === code}
              onChange={() =>
                onChange({
                  ...filters,
                  boardCode: code,
                  board: BOARD_LABELS_AR[code as keyof typeof BOARD_LABELS_AR] || code,
                })
              }
            />
            <span>{BOARD_LABELS_AR[code as keyof typeof BOARD_LABELS_AR] || code}</span>
          </label>
        ))}
      </div>

      {facets.zones.length ? (
        <div className="shop-hotel-filter-block">
          <strong>المنطقة</strong>
          <label className="shop-hotel-filter-radio">
            <input
              type="radio"
              name="shopZone"
              checked={!filters.zone}
              onChange={() => onChange({ ...filters, zone: "" })}
            />
            <span>الكل</span>
          </label>
          {facets.zones.slice(0, 8).map((z) => (
            <label key={z} className="shop-hotel-filter-radio">
              <input
                type="radio"
                name="shopZone"
                checked={filters.zone === z}
                onChange={() => onChange({ ...filters, zone: z })}
              />
              <span>{z}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="shop-hotel-filter-block">
        <strong>السعر الأقصى (د.ك)</strong>
        <input
          type="number"
          min={0}
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })}
          placeholder="مثال: 250"
        />
      </div>

      <div className="shop-hotel-filter-block">
        <label className="shop-hotel-filter-check">
          <input
            type="checkbox"
            checked={filters.freeCancellation}
            onChange={(e) => onChange({ ...filters, freeCancellation: e.target.checked })}
          />
          <span>إلغاء مجاني</span>
        </label>
        <label className="shop-hotel-filter-check">
          <input
            type="checkbox"
            checked={filters.bookableOnly}
            onChange={(e) => onChange({ ...filters, bookableOnly: e.target.checked })}
          />
          <span>متاح للحجز فقط</span>
        </label>
      </div>
    </aside>
  );

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
      <div className={`shop-hotel-filters-drawer${mobileOpen ? " open" : ""}`}>{panel}</div>
      <div className="shop-hotel-filters-desktop">{panel}</div>
    </div>
  );
}
