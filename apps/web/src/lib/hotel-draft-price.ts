import { buildHotelPriceBreakdown, type HotelRateOption } from "@watesly-travel/shared";
import type { HotelDraftPriceBreakdown } from "@/lib/booking-draft";
import { rateDisplayMinor, type HotelOfferRow } from "@/lib/hotel-search";

/** Build review-ready price breakdown from a selected rate + offer. */
export function buildHotelDraftPriceBreakdown(
  rate: HotelRateOption,
  offer: HotelOfferRow,
  nights: number,
): HotelDraftPriceBreakdown {
  const sellMinor = rateDisplayMinor(rate, offer, nights);
  const breakdown = buildHotelPriceBreakdown({
    stayNetMajor: rate.net,
    currency: offer.currency,
    nights,
    rooms: rate.rooms,
    sellAmountMinor: sellMinor || offer.sellAmountMinor,
    costAmountMinor: offer.costAmountMinor,
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
