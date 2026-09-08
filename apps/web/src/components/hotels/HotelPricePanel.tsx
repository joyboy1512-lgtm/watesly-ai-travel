"use client";

import type { HotelDraftPriceBreakdown } from "@/lib/booking-draft";
import { useShopCopy } from "@/components/shop/ShopI18nProvider";

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
  const { t, currency: displayCurrency, formatMoney } = useShopCopy();
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
        <strong className="hotel-price-panel-total" data-display-currency={displayCurrency}>
          {formatMoney(tripTotalMinor, currency)}
        </strong>
        <small>
          {t("tripTotal")}
          {nights > 0
            ? ` · ${t("avgNightShort", { price: formatMoney(perNightMinor, currency) })}`
            : null}
        </small>
        {payAtHotelMinor > 0 ? (
          <em>
            {t("payNowHotel", {
              now: formatMoney(payNowMinor, currency),
              hotel: formatMoney(payAtHotelMinor, currency),
            })}
          </em>
        ) : (
          <em>{taxesIncluded ? t("taxesIncluded") : t("localFeesMaybe")}</em>
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
          <span>{t("tripTotal")}</span>
          <strong>{formatMoney(tripTotalMinor, currency)}</strong>
        </div>
      ) : null}

      <dl className="hotel-price-panel-dl">
        <div>
          <dt>{t("stayPrice")}</dt>
          <dd>{formatMoney(stayMinor, currency)}</dd>
        </div>
        {includedTaxMinor > 0 ? (
          <div>
            <dt>{t("includedTaxes")}</dt>
            <dd>{formatMoney(includedTaxMinor, currency)}</dd>
          </div>
        ) : null}
        {excludedTaxMinor > 0 ? (
          <div>
            <dt>{t("excludedTaxes")}</dt>
            <dd>{formatMoney(excludedTaxMinor, currency)}</dd>
          </div>
        ) : null}
        {serviceFeeMinor > 0 ? (
          <div>
            <dt>{t("wgFees")}</dt>
            <dd>{formatMoney(serviceFeeMinor, currency)}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t("payNow")}</dt>
          <dd>{formatMoney(payNowMinor, currency)}</dd>
        </div>
        {payAtHotelMinor > 0 ? (
          <div>
            <dt>{t("payAtHotel")}</dt>
            <dd>{formatMoney(payAtHotelMinor, currency)}</dd>
          </div>
        ) : null}
        {!emphasizeTotal ? (
          <div className="total">
            <dt>{t("tripTotal")}</dt>
            <dd>{formatMoney(tripTotalMinor, currency)}</dd>
          </div>
        ) : null}
      </dl>

      {payAtHotelMinor > 0 ? (
        <p className="hotel-price-panel-split">
          {t("payNowLine", { price: formatMoney(payNowMinor, currency) })}
          <br />
          {t("payHotelLine", { price: formatMoney(payAtHotelMinor, currency) })}
          <br />
          {t("totalLine", { price: formatMoney(tripTotalMinor, currency) })}
        </p>
      ) : (
        <p className="hotel-price-panel-note">
          {taxesIncluded
            ? t("taxesInPrice")
            : t("localFeesHotel")}
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
