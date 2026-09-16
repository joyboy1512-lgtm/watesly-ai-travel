import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FlightOffer, InternalPriceBreakdown } from "@watesly-travel/shared";
import { listFareOptionsFromDetails } from "@watesly-travel/shared";
import { aggregateFlightsKeepFareFamilies } from "./offer-aggregation";

function priced(
  id: string,
  brand: string,
  cabin: string,
  sell: number,
): {
  offer: FlightOffer;
  pricing: InternalPriceBreakdown;
} {
  return {
    offer: {
      providerKey: "mock",
      providerOfferRef: id,
      description: "KU KWI → DXB",
      costAmountMinor: sell,
      currency: "KWD",
      revalidationToken: id,
      expiresAt: new Date().toISOString(),
      raw: { fareBrand: brand, cabin, airlineCode: "KU" },
    },
    pricing: {
      costAmountMinor: sell,
      sellAmountMinor: sell,
      profitAmountMinor: 0,
      currency: "KWD",
    },
  };
}

describe("aggregateFlightsKeepFareFamilies", () => {
  it("keeps Kuwait Airways saver/class/flexi on one itinerary card", () => {
    const rows = [
      priced("ku-saver", "Economy Saver", "economy", 40000),
      priced("ku-econ", "Economy", "economy", 43200),
      priced("ku-class", "Economy Class", "economy", 46400),
      priced("ku-flexi", "Economy Flexi", "economy", 51200),
      priced("ku-biz", "Business Saver", "business", 74000),
    ];
    const out = aggregateFlightsKeepFareFamilies(
      rows,
      () => "itin:KU413",
      { mode: "cheapest" },
      {},
      "economy",
    );
    assert.equal(out.length, 1);
    assert.equal(out[0]!.offer.providerOfferRef, "ku-saver");
    const options = listFareOptionsFromDetails(out[0]!.offer.raw);
    assert.equal(options.length, 5);
    assert.deepEqual(
      options.map((row) => row.brandKey),
      ["saver", "economy", "economy_class", "flex", "business_saver"],
    );
  });
});
