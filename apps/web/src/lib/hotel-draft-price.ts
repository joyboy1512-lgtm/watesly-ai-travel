import {
  buildHotelPriceBreakdown,
  hotelMajorToMinor,
  hotelOfferMarkupRatio,
  type HotelRateOption,
} from "@watesly-travel/shared";
import type { HotelDraftPriceBreakdown } from "./booking-draft";

type PricedHotelOffer = {
  currency: string;
  sellAmountMinor?: number;
  costAmountMinor?: number;
};

export { hotelOfferMarkupRatio };

export function hotelRateStayCostMinor(rate: HotelRateOption, currency: string): number {
  return hotelMajorToMinor(Number(rate.net || 0), currency);
}

/** Sell for this selected rate using the offer's active pricing-rule ratio. */
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

export function draftOfferPricing(draft: {
  selectedRates?: Array<{
    net?: number;
    taxes?: HotelRateOption["taxes"];
    dailyRates?: HotelRateOption["dailyRates"];
    netBasis?: HotelRateOption["netBasis"];
  }>;
  selectedRate?: {
    net?: number;
    taxes?: HotelRateOption["taxes"];
    dailyRates?: HotelRateOption["dailyRates"];
    netBasis?: HotelRateOption["netBasis"];
  };
  hotel: { currency: string; sellAmountMinor: number; details: Record<string, unknown> };
  nights?: number;
}): HotelDraftPriceBreakdown | null {
  const rates = draft.selectedRates?.length
    ? draft.selectedRates
    : draft.selectedRate
      ? [draft.selectedRate]
      : [];
  return reviewBreakdownFromDraft({
    rates,
    currency: draft.hotel.currency,
    sellAmountMinor:
      Number(draft.hotel.details.offerSellAmountMinor) || draft.hotel.sellAmountMinor,
    costAmountMinor: Number(draft.hotel.details.costAmountMinor) || undefined,
    nights: draft.nights || 1,
  });
}

export function reviewBreakdownFromDraft(input: {
  rates: Array<{
    net?: number;
    taxes?: HotelRateOption["taxes"];
    dailyRates?: HotelRateOption["dailyRates"];
    netBasis?: HotelRateOption["netBasis"];
  }>;
  currency: string;
  sellAmountMinor?: number;
  costAmountMinor?: number;
  nights: number;
}): HotelDraftPriceBreakdown | null {
  const rows = input.rates
    .filter((row) => Number(row.net) > 0)
    .map((row) =>
      buildHotelDraftPriceBreakdown(
        row as HotelRateOption,
        {
          currency: input.currency,
          sellAmountMinor: input.sellAmountMinor,
          costAmountMinor: input.costAmountMinor,
        },
        input.nights,
      ),
    );
  const summed = sumHotelDraftBreakdowns(rows);
  if (!summed) return null;
  summed.perNightMinor = Math.round(summed.payNowMinor / Math.max(1, input.nights));
  return summed;
}

export function sumHotelDraftBreakdowns(
  rows: HotelDraftPriceBreakdown[],
): HotelDraftPriceBreakdown | null {
  if (!rows.length) return null;
  return rows.reduce((acc, row) => ({
    stayMinor: acc.stayMinor + row.stayMinor,
    includedTaxMinor: acc.includedTaxMinor + row.includedTaxMinor,
    excludedTaxMinor: acc.excludedTaxMinor + row.excludedTaxMinor,
    serviceFeeMinor: acc.serviceFeeMinor + row.serviceFeeMinor,
    payNowMinor: acc.payNowMinor + row.payNowMinor,
    payAtHotelMinor: acc.payAtHotelMinor + row.payAtHotelMinor,
    tripTotalMinor: acc.tripTotalMinor + row.tripTotalMinor,
    perNightMinor: acc.perNightMinor + row.perNightMinor,
    taxesIncluded: acc.taxesIncluded && row.taxesIncluded,
  }));
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
