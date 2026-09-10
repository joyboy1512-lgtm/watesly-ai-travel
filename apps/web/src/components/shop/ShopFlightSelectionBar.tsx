"use client";

import { useShopCopy } from "@/components/shop/ShopI18nProvider";
import { airportPlaceLabel } from "@/lib/airport-cities";
import type { ComposedTrip } from "@/lib/flight-compose";
import {
  airlineLogo,
  formatClock,
  formatDay,
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

function CustomLeg({
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
  const fromPlace = airportPlaceLabel(from || "");
  const toPlace = airportPlaceLabel(to || "");

  if (empty) {
    return (
      <div className="shop-ticket-leg-v2 kayak-leg shop-custom-trip-leg empty" dir="ltr">
        <div className="shop-custom-trip-empty-wrap">
          <strong>{label}</strong>
          <p>{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-ticket-leg-v2 kayak-leg shop-custom-trip-leg" dir="ltr">
      <div className="shop-ticket-kayak-check">
        {onClear ? (
          <button type="button" className="shop-custom-trip-x" onClick={onClear} aria-label="إزالة">
            ×
          </button>
        ) : (
          <span aria-hidden />
        )}
      </div>

      <div className="shop-ticket-airline-col">
        <div className="shop-ticket-airline-logo">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={airlineName || ""} width={64} height={64} />
          ) : (
            <div className="shop-ticket-logo-fallback">{airlineCode || "✈"}</div>
          )}
        </div>
        <div className="shop-ticket-airline-text">
          <strong title={airlineName}>{airlineName || airlineCode}</strong>
          <span>{label}</span>
        </div>
      </div>

      <div className="shop-ticket-od dep">
        <strong className="shop-ticket-clock">{formatClock(departAt)}</strong>
        <small className="shop-ticket-day">{formatDay(departAt) || " "}</small>
        <span className="shop-ticket-iata">{fromPlace || from}</span>
      </div>

      <div className="shop-ticket-path">
        <span className="shop-ticket-meta-duration">
          المدة: <bdi>{durationLabel || "—"}</bdi>
        </span>
        <div className="shop-ticket-route" aria-hidden>
          <span className="shop-ticket-route-line" />
        </div>
        <div className="shop-ticket-path-meta">
          <span
            className={`shop-ticket-meta-stops${stops === 0 ? " direct" : ""}`}
          >
            {typeof stops === "number" ? stopsLabel(stops) : "—"}
          </span>
        </div>
      </div>

      <div className="shop-ticket-od arr">
        <strong className="shop-ticket-clock">{formatClock(arriveAt)}</strong>
        <small className="shop-ticket-day">{formatDay(arriveAt) || " "}</small>
        <span className="shop-ticket-iata">{toPlace || to}</span>
      </div>
    </div>
  );
}

/** Custom trip card — same boarding-pass shape as result cards, red accents. */
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
  const { currency: displayCurrency, formatMoney } = useShopCopy();
  const missingReturn = isRoundTrip && !trip.return;

  return (
    <article
      className="shop-ticket-card shop-ticket-card-v2 shop-ticket-card-bp shop-custom-trip-card"
      role="region"
      aria-label="رحلة مخصصة"
    >
      <div className="shop-ticket-badges shop-custom-trip-badges">
        <span className="shop-ticket-badge shop-custom-trip-title">رحلة مخصصة</span>
        <button type="button" className="shop-custom-trip-clear" onClick={onClear}>
          مسح الاختيار
        </button>
      </div>

      <div className="shop-ticket-body-v2">
        <div className="shop-ticket-legs-v2">
          <CustomLeg
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
              <CustomLeg
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
              <CustomLeg
                label="عودة"
                empty
                emptyText="اختر رحلة العودة ✓ من البطاقات أدناه"
              />
            )
          ) : null}
        </div>
      </div>

      <aside className="shop-ticket-side-v2 shop-ticket-stub">
        <div className="shop-ticket-price-block">
          <strong className="shop-ticket-price" data-display-currency={displayCurrency}>
            {formatMoney(trip.totalPriceMinor, trip.currency)}
          </strong>
        </div>
        <div className="shop-ticket-stub-totals">
          <span>السعر الإجمالي للرحلة</span>
          <span>شامل الضرائب</span>
        </div>
        <div className="shop-ticket-cta-group">
          <button
            type="button"
            className="shop-ticket-details-btn primary shop-custom-trip-cta"
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
          <button
            type="button"
            className="shop-ticket-details-link"
            disabled={!canProceed || missingReturn}
            onClick={onSelectTrip}
          >
            التفاصيل والشروط
          </button>
        </div>
      </aside>
    </article>
  );
}
