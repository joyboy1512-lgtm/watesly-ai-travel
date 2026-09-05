/**
 * Node built-in test suite for hotel money + normalizer.
 * Run: node --import tsx --test packages/shared/src/hotel-money.test.ts
 * Or after build: node --test packages/shared/dist/hotel-money.test.js
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertStayPriceEquation,
  buildHotelPriceBreakdown,
  hotelMajorToMinor,
  hotelMinorToMajor,
  sellMinorForStayNet,
  sumDailyRatesMajor,
  validateHotelSellPrice,
} from "./hotel-money";
import {
  displayFromMinorForOffer,
  normalizeGuestRating,
  normalizeHotelOffer,
} from "./hotel-offer-normalizer";

describe("hotel money — Hotelbeds stay-total semantics", () => {
  it("converts KWD major to minor with 3 decimals", () => {
    assert.equal(hotelMajorToMinor(150.5, "KWD"), 150500);
    assert.equal(hotelMinorToMajor(150500, "KWD").toFixed(3), "150.500");
  });

  it("does NOT re-apply ×1000 when computing sell from stay net", () => {
    // Hotelbeds: stay net 150.500 KWD → cost 150500 minor, sell +10% = 165550
    const display = sellMinorForStayNet({
      rateNetMajor: 150.5,
      currency: "KWD",
      sellAmountMinor: 165550,
      costAmountMinor: 150500,
      referenceNetMajor: 150.5,
    });
    assert.equal(display, 165550);
    const major = hotelMinorToMajor(display, "KWD");
    assert.ok(major < 1000, `expected sensible KWD total, got ${major}`);
  });

  it("rejects the old buggy formula result (hundreds of thousands KWD)", () => {
    // Simulate old bug: costMinor = net * 1000 * nights; ratio = sell / majorNet
    const net = 150.5;
    const nights = 3;
    const sell = 165550;
    const buggy = Math.round(net * 1000 * nights * (sell / net));
    const buggyMajor = hotelMinorToMajor(buggy, "KWD");
    assert.ok(buggyMajor > 10000, "sanity: old formula is huge");
    const validation = validateHotelSellPrice({
      totalMinor: buggy,
      currency: "KWD",
      nights,
    });
    assert.equal(validation.ok, false);
    if (!validation.ok) assert.equal(validation.reason, "out_of_range");
  });

  it("sums daily rates instead of average × nights", () => {
    const daily = [{ net: 40 }, { net: 45 }, { net: 50 }, { net: 42 }, { net: 48 }, { net: 55 }, { net: 60 }];
    const { sumMajor, usedDaily } = sumDailyRatesMajor(daily, 999);
    assert.equal(usedDaily, true);
    assert.equal(sumMajor, 40 + 45 + 50 + 42 + 48 + 55 + 60);
  });

  it("equation: cost + serviceFee = sell", () => {
    const stayNetMajor = 171.72; // EUR stay total example converted already
    const currency = "KWD";
    // After FX ~ 60.96 KWD
    const stayKwd = 60.961;
    const costMinor = hotelMajorToMinor(stayKwd, currency);
    const sellMinor = Math.round(costMinor * 1.1);
    const check = assertStayPriceEquation({
      stayNetMajor: stayKwd,
      currency,
      nights: 7,
      dailyRates: Array.from({ length: 7 }, () => ({ net: Number((stayKwd / 7).toFixed(3)) })),
      sellAmountMinor: sellMinor,
      costAmountMinor: costMinor,
      toleranceMinor: 50,
    });
    assert.equal(check.ok, true, check.detail);

    const breakdown = buildHotelPriceBreakdown({
      stayNetMajor: stayKwd,
      currency,
      nights: 7,
      sellAmountMinor: sellMinor,
      costAmountMinor: costMinor,
    });
    assert.equal(breakdown.totalMinor, sellMinor);
    assert.equal(breakdown.baseMinor + breakdown.serviceFeeMinor, sellMinor);
    assert.equal(
      breakdown.perNightMinor,
      Math.round(sellMinor / 7),
    );
  });

  it("hides invalid zero/negative prices", () => {
    assert.equal(validateHotelSellPrice({ totalMinor: 0, currency: "KWD", nights: 3 }).ok, false);
    assert.equal(validateHotelSellPrice({ totalMinor: -100, currency: "KWD", nights: 3 }).ok, false);
    assert.equal(
      validateHotelSellPrice({ totalMinor: Number.NaN, currency: "KWD", nights: 3 }).ok,
      false,
    );
  });
});

describe("hotel offer normalizer — ratings", () => {
  it("does not treat ranking as guest rating", () => {
    assert.equal(normalizeGuestRating({ ranking: 85, rating: 8.5, reviewCount: 3570 }), null);
  });

  it("accepts explicit guest rating with source", () => {
    const g = normalizeGuestRating({
      guestRatingScore: 8.4,
      guestRatingScale: 10,
      guestReviewCount: 120,
      guestRatingSource: "TrustedReviews",
    });
    assert.ok(g);
    assert.equal(g!.score, 8.4);
    assert.equal(g!.source, "TrustedReviews");
  });

  it("normalizes offer prices without night double-count", () => {
    const offer = normalizeHotelOffer({
      sellAmountMinor: 165550,
      costAmountMinor: 150500,
      currency: "KWD",
      details: {
        provider: "hotelbeds",
        liveMode: true,
        hotelCode: "123",
        name: "Test Hotel",
        stars: 4,
        currency: "KWD",
        providerCurrency: "EUR",
        minRate: 150.5,
        nights: 7,
        checkInDate: "2026-09-10",
        checkOutDate: "2026-09-17",
        source: "hotelbeds-sandbox",
        sourceLabel: "Hotelbeds Sandbox",
        rooms: [],
        rateOptions: [
          {
            rateKey: "SECRET_RATE_KEY_DO_NOT_LOG",
            rateType: "BOOKABLE",
            roomCode: "DBL",
            roomName: "Double Standard",
            boardCode: "BB",
            boardName: "Bed and Breakfast",
            net: 150.5,
            netBasis: "stay",
            currency: "KWD",
            freeCancellation: true,
            cancellationPolicies: [],
            promotions: [],
          },
        ],
        boards: [],
        boardCodes: [],
        paymentTypes: [],
        rateTypes: [],
        zones: [],
        promotions: [],
      },
    });
    assert.ok(offer.cheapest);
    assert.equal(offer.cheapest!.totalMinor, 165550);
    assert.equal(offer.sandbox, true);
    assert.match(offer.sourceLabel, /Sandbox|تجريب/);
    assert.equal(offer.guestRating, null);
    assert.equal(offer.cheapest!.boardNameAr, "شامل الإفطار");
    // rateKey must be hashed, not raw
    assert.ok(!JSON.stringify(offer).includes("SECRET_RATE_KEY"));
  });

  it("displayFromMinorForOffer matches sell for cheapest stay rate", () => {
    const priced = displayFromMinorForOffer({
      sellAmountMinor: 165550,
      costAmountMinor: 150500,
      currency: "KWD",
      nights: 7,
      minRateMajor: 150.5,
      rateNetMajor: 150.5,
    });
    assert.equal(priced.valid, true);
    assert.equal(priced.displayFromMinor, 165550);
    assert.equal(priced.perNightMinor, Math.round(165550 / 7));
  });
});
