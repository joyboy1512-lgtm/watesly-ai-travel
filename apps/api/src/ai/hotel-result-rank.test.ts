import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  rankHotelOffers,
  resolveHotelSearchRank,
} from "./hotel-result-rank";

function hotel(
  id: string,
  price: number,
  km?: number,
): {
  id: string;
  costAmountMinor: number;
  sellAmountMinor: number;
  raw: { distanceToCenterKm?: number };
} {
  return {
    id,
    costAmountMinor: price,
    sellAmountMinor: price,
    raw: km == null ? {} : { distanceToCenterKm: km },
  };
}

describe("resolveHotelSearchRank", () => {
  it("keeps a city-only search on price", () => {
    assert.equal(resolveHotelSearchRank(undefined, "دبي"), "cheapest");
    assert.equal(resolveHotelSearchRank("", "Dubai"), "cheapest");
    assert.equal(resolveHotelSearchRank(undefined, "CAI"), "cheapest");
  });

  it("ranks a named area by distance", () => {
    assert.equal(resolveHotelSearchRank(undefined, "السالمية"), "nearest");
    assert.equal(resolveHotelSearchRank(undefined, "دبي مارينا"), "nearest");
    assert.equal(
      resolveHotelSearchRank(undefined, "قريب من برج خليفة"),
      "nearest",
    );
  });

  it("lets an explicit sort win", () => {
    assert.equal(resolveHotelSearchRank("nearest", "دبي"), "nearest");
    assert.equal(resolveHotelSearchRank("cheapest", "السالمية"), "cheapest");
  });
});

describe("rankHotelOffers", () => {
  it("puts the closest hotel first and uses price as a tie break", () => {
    const ranked = rankHotelOffers(
      [hotel("far-cheap", 10, 12), hotel("near-dear", 90, 0.4), hotel("near-cheap", 40, 0.4)],
      "nearest",
    );
    assert.deepEqual(
      ranked.map((row) => row.id),
      ["near-cheap", "near-dear", "far-cheap"],
    );
  });

  it("sends hotels without a distance to the end", () => {
    const ranked = rankHotelOffers(
      [hotel("unknown", 5), hotel("near", 50, 1)],
      "nearest",
    );
    assert.equal(ranked[0]?.id, "near");
    assert.equal(ranked[1]?.id, "unknown");
  });

  it("orders a city search by sell price", () => {
    const ranked = rankHotelOffers(
      [hotel("dear", 80, 1), hotel("cheap", 20, 9)],
      "cheapest",
    );
    assert.deepEqual(
      ranked.map((row) => row.id),
      ["cheap", "dear"],
    );
  });
});
