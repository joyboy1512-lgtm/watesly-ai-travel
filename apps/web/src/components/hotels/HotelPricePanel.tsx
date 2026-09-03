"use client";

import { formatMoneyMinor } from "@/lib/format";
import type { HotelDraftPriceBreakdown } from "@/lib/booking-draft";

export type HotelPricePanelInput = {
  currency: string;
  nights?: number;
  breakdown: HotelDraftPriceBreakdown;
  /** Compact for cards; full for detail/review/checkout */
  variant?: "full" | "card" | "aside";
  roomLabel?: string;
  boardLabel?: string;
  emphasizeTotal?: boolean;
};

/**
 * Single source of truth for hotel price display across results, detail, review, checkout.
 * Trip total is always the primary figure.
 */
export function HotelPricePanel({
  currency,
  nights = 1,
  breakdown,
  variant = "full",
  roomLabel,
  boardLabel,
  emphasizeTotal = true,
}: HotelPricePanelInput) {
  const {
    stayMinor,
    includedTaxMinor,
    excludedTaxMinor,
    serviceFeeMinor,
    payNowMinor,
    payAtHotelMinor,
    tripTotalMinor,
    perNightMinor,
    taxesIncluded,
  } = breakdown;

  if (variant === "card") {
    return (
      <div className="hotel-price-panel hotel-price-panel-card">
        <strong className="hotel-price-panel-total">
          {formatMoneyMinor(tripTotalMinor, currency)}
        </strong>
        <small>التكلفة الكلية · {nights > 0 ? `متوسط ${formatMoneyMinor(perNightMinor, currency)} / ليلة` : null}</small>
        {payAtHotelMinor > 0 ? (
          <em>
            تدفع الآن {formatMoneyMinor(payNowMinor, currency)} · في الفندق{" "}
            {formatMoneyMinor(payAtHotelMinor, currency)}
          </em>
        ) : (
          <em>{taxesIncluded ? "شامل الضرائب" : "قد تُضاف رسوم محلية"}</em>
        )}
      </div>
    );
  }

  return (
    <div className={`hotel-price-panel hotel-price-panel-${variant}`}>
      {roomLabel || boardLabel ? (
        <p className="hotel-price-panel-room">
          {[roomLabel, boardLabel].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      {emphasizeTotal ? (
        <div className="hotel-price-panel-hero">
          <span>التكلفة الكلية</span>
          <strong>{formatMoneyMinor(tripTotalMinor, currency)}</strong>
        </div>
      ) : null}

      <dl className="hotel-price-panel-dl">
        <div>
          <dt>سعر الإقامة</dt>
          <dd>{formatMoneyMinor(stayMinor, currency)}</dd>
        </div>
        {includedTaxMinor > 0 ? (
          <div>
            <dt>ضرائب ورسوم مشمولة</dt>
            <dd>{formatMoneyMinor(includedTaxMinor, currency)}</dd>
          </div>
        ) : null}
        {excludedTaxMinor > 0 ? (
          <div>
            <dt>ضرائب غير مشمولة</dt>
            <dd>{formatMoneyMinor(excludedTaxMinor, currency)}</dd>
          </div>
        ) : null}
        {serviceFeeMinor > 0 ? (
          <div>
            <dt>رسوم WeekendGate</dt>
            <dd>{formatMoneyMinor(serviceFeeMinor, currency)}</dd>
          </div>
        ) : null}
        <div>
          <dt>يُدفع الآن</dt>
          <dd>{formatMoneyMinor(payNowMinor, currency)}</dd>
        </div>
        {payAtHotelMinor > 0 ? (
          <div>
            <dt>يُدفع في الفندق</dt>
            <dd>{formatMoneyMinor(payAtHotelMinor, currency)}</dd>
          </div>
        ) : null}
        {!emphasizeTotal ? (
          <div className="total">
            <dt>التكلفة الكلية</dt>
            <dd>{formatMoneyMinor(tripTotalMinor, currency)}</dd>
          </div>
        ) : null}
      </dl>

      {payAtHotelMinor > 0 ? (
        <p className="hotel-price-panel-split">
          تدفع الآن: {formatMoneyMinor(payNowMinor, currency)}
          <br />
          تدفع في الفندق: {formatMoneyMinor(payAtHotelMinor, currency)}
          <br />
          التكلفة الكلية: {formatMoneyMinor(tripTotalMinor, currency)}
        </p>
      ) : (
        <p className="hotel-price-panel-note">
          {taxesIncluded
            ? "الضرائب مشمولة في السعر المعروض"
            : "قد تُضاف رسوم محلية في الفندق"}
        </p>
      )}
    </div>
  );
}

/** Build panel input from draft breakdown helpers — keeps surfaces identical. */
export function hotelPriceFromParts(input: {
  currency: string;
  stayMinor: number;
  includedTaxMinor?: number;
  excludedTaxMinor?: number;
  serviceFeeMinor?: number;
  payNowMinor: number;
  payAtHotelMinor?: number;
  nights?: number;
}): HotelDraftPriceBreakdown {
  const payAtHotel = input.payAtHotelMinor ?? input.excludedTaxMinor ?? 0;
  const payNow = input.payNowMinor;
  const nights = Math.max(1, input.nights || 1);
  return {
    stayMinor: input.stayMinor,
    includedTaxMinor: input.includedTaxMinor ?? 0,
    excludedTaxMinor: input.excludedTaxMinor ?? payAtHotel,
    serviceFeeMinor: input.serviceFeeMinor ?? 0,
    payNowMinor: payNow,
    payAtHotelMinor: payAtHotel,
    tripTotalMinor: payNow + payAtHotel,
    perNightMinor: Math.round(payNow / nights),
    taxesIncluded: (input.excludedTaxMinor ?? payAtHotel) === 0,
  };
}
