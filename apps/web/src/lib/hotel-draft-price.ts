import {
  buildHotelPriceBreakdown,
  hotelMajorToMinor,
  type HotelRateOption,
} from "@watesly-travel/shared";
import type { HotelDraftPriceBreakdown } from "./booking-draft";

type PricedHotelOffer = {
  currency: string;
  sellAmountMinor?: number;
  costAmountMinor?: number;
};

/** Active-rule sell/cost, ignoring unit-bug ratios that look like 10×–20× markups. */
export function hotelOfferMarkupRatio(sellMinor?: number, costMinor?: number): number {
  const sell = Number(sellMinor || 0);
  const cost = Number(costMinor || 0);
  if (!(sell > 0) || !(cost > 0)) return 1.1;
  const ratio = sell / cost;
  if (!Number.isFinite(ratio) || ratio < 1) return 1.1;
  if (ratio > 3) return 1.1;
  return ratio;
}

export function hotelRateStayCostMinor(rate: HotelRateOption, currency: string): number {
  return hotelMajorToMinor(Number(rate.net || 0), currency);
}

/** Sell for this selected rate only — never the cheapest hotel residual. */
export function sellMinorForSelectedRate(
  rate: HotelRateOption,
  offer: PricedHotelOffer,
  _nights?: number,
): number {
  const stayCost = hotelRateStayCostMinor(rate, offer.currency);
  if (!(stayCost > 0)) return 0;
  return Math.round(stayCost * hotelOfferMarkupRatio(offer.sellAmountMinor, offer.costAmountMinor));
}

/** Build review-ready price breakdown from a selected rate + offer. */
export function buildHotelDraftPriceBreakdown(
  rate: HotelRateOption,
  offer: PricedHotelOffer,
  nights: number,
): HotelDraftPriceBreakdown {
  const stayCost = hotelRateStayCostMinor(rate, offer.currency);
  const sellMinor = sellMinorForSelectedRate(rate, offer, nights);
  const breakdown = buildHotelPriceBreakdown({
    stayNetMajor: rate.net,
    currency: offer.currency,
    nights,
    rooms: 1,
    sellAmountMinor: sellMinor,
    costAmountMinor: stayCost,
    dailyRates: rate.dailyRates,
    taxes: rate.taxes,
    netBasis: rate.netBasis || "stay",
  });
  return {
    stayMinor: breakdown.baseMinor,
    includedTaxMinor: breakdown.includedTaxMinor,
    excludedTaxMinor: breakdown.excludedTaxMinor,
    serviceFeeMinor: breakdown.serviceFeeMinor,
    payNowMinor: breakdown.payNowMinor,
    payAtHotelMinor: breakdown.payAtHotelMinor,
    tripTotalMinor: breakdown.tripTotalMinor,
    perNightMinor: breakdown.perNightMinor,
    taxesIncluded: breakdown.taxesIncluded,
  };
}

export function toDraftHotelRate(rate: HotelRateOption) {
  return {
    rateKey: rate.rateKey,
    rateType: rate.rateType,
    roomCode: rate.roomCode,
    roomName: rate.roomName,
    boardCode: rate.boardCode,
    boardName: rate.boardName,
    net: rate.net,
    currency: rate.currency,
    paymentType: rate.paymentType,
    freeCancellation: rate.freeCancellation,
    allotment: rate.allotment,
    rateComments: rate.rateComments,
    cancellationFrom: rate.cancellationPolicies?.[0]?.from,
    taxes: rate.taxes,
  };
}
