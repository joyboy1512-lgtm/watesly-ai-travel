"use client";

import { formatMoneyMinor } from "@/lib/format";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  airlineLogo,
  formatClock,
  stopsLabel,
} from "@/lib/flight-search";

type Props = {
  trip: ComposedTrip;
  isRoundTrip: boolean;
  canProceed: boolean;
  loading: boolean;
  onSelectTrip: () => void;
  onClear: () => void;
  onClearOutbound?: () => void;
  onClearReturn?: () => void;
};

function MiniLeg({
  label,
  airlineCode,
  airlineName,
  from,
  to,
  departAt,
  arriveAt,
  stops,
  durationLabel,
  empty,
  emptyText,
  onClear,
}: {
  label: string;
  airlineCode?: string;
  airlineName?: string;
  from?: string;
  to?: string;
  departAt?: string;
  arriveAt?: string;
  stops?: number;
  durationLabel?: string;
  empty?: boolean;
  emptyText?: string;
  onClear?: () => void;
}) {
  const logo = airlineLogo(airlineCode, 64);

  if (empty) {
    return (
      <div className="shop-custom-trip-leg empty" dir="ltr">
        <span className="shop-custom-trip-leg-label">{label}</span>
        <p className="shop-custom-trip-empty">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="shop-custom-trip-leg" dir="ltr">
      <span className="shop-custom-trip-leg-label">{label}</span>
      <div className="shop-custom-trip-leg-main">
        <div className="shop-custom-trip-airline">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={airlineName || ""} width={28} height={28} />
          ) : (
            <div className="shop-ticket-logo-fallback small">{airlineCode || "✈"}</div>
          )}
          <span>{airlineName}</span>
        </div>
        <div className="shop-custom-trip-times">
          <strong>{formatClock(departAt)}</strong>
          <span className="shop-custom-trip-dash">
            {durationLabel || "—"}
            {typeof stops === "number" ? ` · ${stopsLabel(stops)}` : ""}
          </span>
          <strong>{formatClock(arriveAt)}</strong>
        </div>
        <div className="shop-custom-trip-airports">
          <span>{from}</span>
          <span>{to}</span>
        </div>
      </div>
      {onClear ? (
        <button type="button" className="shop-custom-trip-x" onClick={onClear} aria-label="إزالة">
          ×
        </button>
      ) : null}
    </div>
  );
}

/** Kayak-style custom trip card pinned above results after checkbox selection. */
export function ShopFlightSelectionBar({
  trip,
  isRoundTrip,
  canProceed,
  loading,
  onSelectTrip,
  onClear,
  onClearOutbound,
  onClearReturn,
}: Props) {
  const missingReturn = isRoundTrip && !trip.return;
  const title = trip.isMixMatch || missingReturn ? "رحلة مخصصة" : "رحلتك المختارة";

  return (
    <article className="shop-custom-trip-card" role="region" aria-label="رحلة مخصصة">
      <header className="shop-custom-trip-head">
        <div>
          <strong className="shop-custom-trip-badge">{title}</strong>
          <p>
            {trip.isMixMatch
              ? "تم دمج ذهاب وعودة من عروض مختلفة"
              : missingReturn
                ? "اختر رحلة العودة من البطاقات أدناه"
                : "يمكنك متابعة الحجز أو تعديل الاختيار"}
          </p>
        </div>
        <button type="button" className="shop-custom-trip-clear" onClick={onClear}>
          مسح الاختيار
        </button>
      </header>

      <div className="shop-custom-trip-body">
        <div className="shop-custom-trip-legs">
          <MiniLeg
            label="ذهاب"
            airlineCode={trip.outbound.airlineCode}
            airlineName={trip.outbound.airlineName}
            from={trip.outbound.from}
            to={trip.outbound.to}
            departAt={trip.outbound.departAt}
            arriveAt={trip.outbound.arriveAt}
            stops={trip.outbound.stops}
            durationLabel={trip.outbound.durationLabel}
            onClear={onClearOutbound}
          />
          {isRoundTrip ? (
            trip.return ? (
              <MiniLeg
                label="عودة"
                airlineCode={trip.return.airlineCode}
                airlineName={trip.return.airlineName}
                from={trip.return.from}
                to={trip.return.to}
                departAt={trip.return.departAt}
                arriveAt={trip.return.arriveAt}
                stops={trip.return.stops}
                durationLabel={trip.return.durationLabel}
                onClear={onClearReturn}
              />
            ) : (
              <MiniLeg label="عودة" empty emptyText="اختر رحلة العودة ✓ من البطاقات أدناه" />
            )
          ) : null}
        </div>

        <div className="shop-custom-trip-side">
          <strong className="shop-custom-trip-price">
            {formatMoneyMinor(trip.totalPriceMinor, trip.currency)}
          </strong>
          <small>إجمالي الرحلة · شامل الضرائب</small>
          <button
            type="button"
            className="shop-custom-trip-cta"
            disabled={!canProceed || loading || missingReturn}
            onClick={onSelectTrip}
          >
            {loading ? (
              <span className="shop-flight-btn-loading">
                <span className="shop-flight-spinner small" aria-hidden /> جاري التحميل…
              </span>
            ) : missingReturn ? (
              "أكمل اختيار العودة"
            ) : (
              "اختيار هذه الرحلة"
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
