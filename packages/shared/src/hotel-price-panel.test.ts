import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHotelPriceBreakdown } from "./hotel-money";

describe("P0 hotel price breakdown consistency", () => {
  it("trip total = pay now + pay at hotel", () => {
    const bd = buildHotelPriceBreakdown({
      stayNetMajor: 63.94,
      currency: "KWD",
      nights: 7,
      rooms: 1,
      sellAmountMinor: 63940,
      costAmountMinor: 52000,
      taxes: {
        allIncluded: false,
        items: [{ amount: 5.852, currency: "KWD", included: false }],
      },
      netBasis: "stay",
    });
    assert.equal(bd.payNowMinor, 63940);
    assert.equal(bd.payAtHotelMinor, 5852);
    assert.equal(bd.tripTotalMinor, 63940 + 5852);
    assert.equal(bd.serviceFeeMinor, 63940 - 52000);
  });

  it("included taxes do not inflate pay-at-hotel", () => {
    const bd = buildHotelPriceBreakdown({
      stayNetMajor: 100,
      currency: "KWD",
      nights: 2,
      sellAmountMinor: 110000,
      costAmountMinor: 100000,
      taxes: {
        allIncluded: true,
        items: [{ amount: 5, currency: "KWD", included: true }],
      },
    });
    assert.equal(bd.payAtHotelMinor, 0);
    assert.equal(bd.tripTotalMinor, bd.payNowMinor);
    assert.ok(bd.includedTaxMinor > 0);
  });
});
