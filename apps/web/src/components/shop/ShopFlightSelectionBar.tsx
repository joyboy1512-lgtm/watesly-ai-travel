"use client";

import { formatMoneyMinor } from "@/lib/format";
import type { ComposedTrip } from "@/lib/flight-compose";
import { formatClock } from "@/lib/flight-search";

type Props = {
  trip: ComposedTrip | null;
  isRoundTrip: boolean;
  canProceed: boolean;
  loading: boolean;
  onSelectTrip: () => void;
  onClear: () => void;
};

export function ShopFlightSelectionBar({
  trip,
  isRoundTrip,
  canProceed,
  loading,
  onSelectTrip,
  onClear,
}: Props) {
  if (!trip) return null;

  const missingReturn = isRoundTrip && !trip.return;

  return (
    <div className="shop-flight-selection-bar" role="region" aria-label="الرحلة المختارة">
      <div className="shop-flight-selection-bar-inner">
        <div className="shop-flight-selection-legs">
          <div className="shop-flight-selection-leg">
            <small>ذهاب</small>
            <strong>
              {formatClock(trip.outbound.departAt)} {trip.outbound.from} → {trip.outbound.to}{" "}
              {formatClock(trip.outbound.arriveAt)}
            </strong>
            <span>{trip.outbound.airlineName}</span>
          </div>
          {isRoundTrip ? (
            <div className="shop-flight-selection-leg">
              <small>عودة</small>
              {trip.return ? (
                <>
                  <strong>
                    {formatClock(trip.return.departAt)} {trip.return.from} → {trip.return.to}{" "}
                    {formatClock(trip.return.arriveAt)}
                  </strong>
                  <span>{trip.return.airlineName}</span>
                </>
              ) : (
                <strong className="shop-flight-selection-missing">اختر رحلة العودة</strong>
              )}
            </div>
          ) : null}
        </div>

        <div className="shop-flight-selection-actions">
          <div className="shop-flight-selection-price">
            <strong>{formatMoneyMinor(trip.totalPriceMinor, trip.currency)}</strong>
            <small>{trip.isMixMatch ? "تركيبة مخصصة" : "عرض شامل"}</small>
          </div>
          <button type="button" className="shop-flight-selection-clear" onClick={onClear}>
            مسح
          </button>
          <button
            type="button"
            className="shop-flight-selection-proceed"
            disabled={!canProceed || loading || missingReturn}
            onClick={onSelectTrip}
          >
            {loading ? (
              <span className="shop-flight-btn-loading">
                <span className="shop-flight-spinner small" aria-hidden /> جاري التحميل…
              </span>
            ) : missingReturn ? (
              "اختر العودة"
            ) : (
              "اختيار الرحلة"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
