import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelDraftPriceBreakdown,
  hotelOfferMarkupRatio,
  reviewBreakdownFromDraft,
  sellMinorForSelectedRate,
} from "./hotel-draft-price";
import type { HotelRateOption } from "@watesly-travel/shared";

function rate(partial: Partial<HotelRateOption> & { rateKey: string; net: number }): HotelRateOption {
  return {
    rateType: "BOOKABLE",
    roomCode: "DBL",
    roomName: "Superior",
    boardCode: "RO",
    boardName: "Room only",
    currency: "KWD",
    freeCancellation: false,
    cancellationPolicies: [],
    promotions: [],
    rooms: 1,
    ...partial,
  };
}

const offer = {
  currency: "KWD",
  sellAmountMinor: 571408,
  costAmountMinor: 519462,
};

test("hotelOfferMarkupRatio follows the active rule and does not invent 10%", () => {
  assert.equal(hotelOfferMarkupRatio(571408, 519462).toFixed(3), (571408 / 519462).toFixed(3));
  assert.equal(hotelOfferMarkupRatio(12_003_095, 519_462), 12_003_095 / 519_462);
  assert.equal(hotelOfferMarkupRatio(0, 519_462), 1);
});

test("selected-rate sell uses that room cost times the offer rule ratio", () => {
  const selected = rate({ rateKey: "exec", net: 203.728, roomName: "Executive" });
  const priced = sellMinorForSelectedRate(selected, offer, 7);
  assert.equal(priced, Math.round(203728 * (571408 / 519462)));
});

test("review breakdown keeps the rule sell, not sell minus a different room", () => {
  const selected = rate({
    rateKey: "exec",
    net: 203.728,
    taxes: {
      allIncluded: false,
      items: [{ type: "TAX", amount: 11.704, currency: "KWD", included: false }],
    },
  });
  const row = buildHotelDraftPriceBreakdown(selected, offer, 7);
  assert.equal(row.stayMinor, 203728);
  assert.equal(row.payNowMinor, Math.round(203728 * (571408 / 519462)));
  assert.equal(row.serviceFeeMinor, row.payNowMinor - row.stayMinor);
});

test("reviewBreakdownFromDraft applies the stored rule ratio to each selected room", () => {
  const ratio = 12_003_095 / 519_462;
  const bd = reviewBreakdownFromDraft({
    rates: [
      { net: 200 },
      { net: 210 },
      { net: 201.184, taxes: { allIncluded: false, items: [{ amount: 35.112, currency: "KWD", included: false }] } },
    ],
    currency: "KWD",
    sellAmountMinor: 12_003_095,
    costAmountMinor: 519_462,
    nights: 7,
  });
  assert.ok(bd);
  assert.equal(bd!.stayMinor, 611184);
  assert.equal(bd!.payNowMinor, Math.round(200000 * ratio) + Math.round(210000 * ratio) + Math.round(201184 * ratio));
});

test("three mix-match rooms scale the same rule, they do not inherit hotel sell three times", () => {
  const rooms = [
    rate({ rateKey: "a", net: 200 }),
    rate({ rateKey: "b", net: 210 }),
    rate({ rateKey: "c", net: 201.184 }),
  ];
  const rows = rooms.map((row) => buildHotelDraftPriceBreakdown(row, offer, 7));
  const stay = rows.reduce((s, r) => s + r.stayMinor, 0);
  const payNow = rows.reduce((s, r) => s + r.payNowMinor, 0);
  assert.equal(stay, 611184);
  assert.equal(payNow, rows.reduce((s, r) => s + Math.round(r.stayMinor * (571408 / 519462)), 0));
  assert.ok(payNow < offer.sellAmountMinor * 3);
});
