import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHotelDraftPriceBreakdown,
  hotelOfferMarkupRatio,
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

test("hotelOfferMarkupRatio keeps a real 10% rule and drops a 20× unit bug", () => {
  assert.equal(hotelOfferMarkupRatio(571408, 519462).toFixed(3), (571408 / 519462).toFixed(3));
  assert.equal(hotelOfferMarkupRatio(12_003_095, 519_462), 1.1);
});

test("selected-rate sell uses that room cost, not the cheapest hotel residual", () => {
  const selected = rate({ rateKey: "exec", net: 203.728, roomName: "Executive" });
  const priced = sellMinorForSelectedRate(selected, offer, 7);
  assert.ok(priced > 200_000 && priced < 280_000, `sell=${priced}`);
});

test("review breakdown shows a small WG commission instead of sell minus cheapest", () => {
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
  assert.ok(row.serviceFeeMinor > 0 && row.serviceFeeMinor < row.stayMinor * 0.3);
  assert.ok(row.payNowMinor < 280_000);
  assert.ok(row.serviceFeeMinor < 80_000, `fee=${row.serviceFeeMinor}`);
});

test("three mix-match rooms do not inherit the hotel sell three times", () => {
  const rooms = [
    rate({ rateKey: "a", net: 200 }),
    rate({ rateKey: "b", net: 210 }),
    rate({ rateKey: "c", net: 201.184 }),
  ];
  const rows = rooms.map((row) => buildHotelDraftPriceBreakdown(row, offer, 7));
  const stay = rows.reduce((s, r) => s + r.stayMinor, 0);
  const fee = rows.reduce((s, r) => s + r.serviceFeeMinor, 0);
  const payNow = rows.reduce((s, r) => s + r.payNowMinor, 0);
  assert.equal(stay, 611184);
  assert.ok(fee < stay * 0.3, `fee=${fee}`);
  assert.ok(payNow < 800_000, `payNow=${payNow}`);
});
