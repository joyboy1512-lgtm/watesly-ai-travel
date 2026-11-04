import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hotelsWithinRadius,
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
    assert.equal(resolveHotelSearchRank(undefined, "مكة"), "cheapest");
    assert.equal(resolveHotelSearchRank(undefined, "مكة المكرمة"), "cheapest");
    assert.equal(resolveHotelSearchRank(undefined, "مدينة القاهرة"), "cheapest");
    assert.equal(resolveHotelSearchRank("nearest", "مكة المكرمة"), "cheapest");
  });

  it("ranks a named area by distance", () => {
    assert.equal(resolveHotelSearchRank(undefined, "السالمية"), "nearest");
    assert.equal(resolveHotelSearchRank(undefined, "دبي مارينا"), "nearest");
    assert.equal(
      resolveHotelSearchRank(undefined, "قريب من برج خليفة"),
      "nearest",
    );
  });

  it("keeps a city on price even when nearest is requested without a place", () => {
    assert.equal(resolveHotelSearchRank("nearest", "دبي"), "cheapest");
    assert.equal(resolveHotelSearchRank("nearest", "مكة"), "cheapest");
    assert.equal(resolveHotelSearchRank("nearest", "برج خليفة"), "nearest");
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

  it("keeps only hotels inside the requested circle", () => {
    const near = hotel("near", 80, 1.2);
    const far = hotel("far", 20, 18);
    const kept = hotelsWithinRadius([far, near], 1.5);
    assert.deepEqual(
      kept.map((row) => row.id),
      ["near"],
    );
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
