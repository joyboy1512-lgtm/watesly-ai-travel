import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { FlightOffer, HotelOffer, InternalPriceBreakdown } from "@watesly-travel/shared";
import { listFareOptionsFromDetails } from "@watesly-travel/shared";
import {
  aggregateFlightsKeepFareFamilies,
  aggregateHotelOffers,
} from "./offer-aggregation";

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

function pricedHotel(
  providerKey: string,
  ref: string,
  sell: number,
  raw: Record<string, unknown>,
): {
  offer: HotelOffer;
  serviceType: "hotel";
  pricing: InternalPriceBreakdown;
  customerVisible: unknown;
} {
  return {
    offer: {
      providerKey,
      providerOfferRef: ref,
      description: String(raw.name || "Hotel"),
      costAmountMinor: sell,
      currency: "EUR",
      revalidationToken: ref,
      expiresAt: new Date().toISOString(),
      raw,
    },
    serviceType: "hotel",
    pricing: {
      costAmountMinor: sell,
      sellAmountMinor: sell,
      profitAmountMinor: 0,
      currency: "EUR",
    },
    customerVisible: null,
  };
}

describe("aggregateHotelOffers", () => {
  it("unions facilities and rates for the same property", () => {
    const out = aggregateHotelOffers(
      [
        pricedHotel("hotelbeds", "hb-1", 18000, {
          name: "Novotel Barcelona",
          giataId: "99",
          hotelCode: "1",
          facilities: ["wifi"],
          facilityLabels: ["واي فاي"],
          propertyType: "hotel",
          rateOptions: [
            {
              rateKey: "a",
              net: 80,
              boardCode: "RO",
              boardName: "RO",
              roomCode: "DBL",
              roomName: "Double",
              freeCancellation: false,
              promotions: [],
            },
          ],
        }),
        pricedHotel("webbeds", "wb-1", 21000, {
          name: "Novotel Barcelona",
          giataId: "99",
          hotelCode: "9",
          facilities: ["pool"],
          facilityLabels: ["مسبح"],
          propertyType: "hotel",
          rateOptions: [
            {
              rateKey: "b",
              net: 90,
              boardCode: "BB",
              boardName: "BB",
              roomCode: "DBL",
              roomName: "Double",
              paymentType: "AT_HOTEL",
              freeCancellation: true,
              promotions: [],
            },
          ],
        }),
      ],
      { mode: "cheapest" },
    );
    assert.equal(out.length, 1);
    const raw = out[0]!.offer.raw as Record<string, unknown>;
    assert.deepEqual([...(raw.facilities as string[])].sort(), ["pool", "wifi"]);
    assert.ok((raw.facilityLabels as string[]).includes("واي فاي"));
    assert.ok((raw.facilityLabels as string[]).includes("مسبح"));
    assert.equal((raw.rateOptions as unknown[]).length, 2);
  });
});
