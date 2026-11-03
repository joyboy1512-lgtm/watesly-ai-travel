import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HotelOffer } from "@watesly-travel/shared";
import { serializeSearchResult } from "./tool-result-serializers";

function offer(name: string, km: number, label: string): HotelOffer & {
  sellAmountMinor: number;
} {
  return {
    providerKey: "hotelbeds",
    providerOfferRef: `hb-${name}`,
    description: name,
    costAmountMinor: 10_000,
    currency: "KWD",
    revalidationToken: "rv",
    expiresAt: "2026-12-01T00:00:00.000Z",
    sellAmountMinor: 12_000,
    raw: {
      name,
      stars: 4,
      distanceToCenterKm: km,
      distanceToCenterLabel: label,
    },
  };
}

describe("serializeSearchResult hotel rank", () => {
  it("includes the distance only when the list is ranked by nearest", () => {
    const rows = [offer("Salmiya Inn", 0.6, "600 م")];
    const nearest = JSON.parse(
      serializeSearchResult({
        provider: "hotelbeds",
        liveMode: true,
        kind: "hotel",
        rankedBy: "nearest",
        rows,
      }),
    );
    assert.equal(nearest.rankedBy, "nearest");
    assert.equal(nearest.items[0].distanceToCenterLabel, "600 م");

    const cheapest = JSON.parse(
      serializeSearchResult({
        provider: "hotelbeds",
        liveMode: true,
        kind: "hotel",
        rankedBy: "cheapest",
        rows,
      }),
    );
    assert.equal(cheapest.rankedBy, "cheapest");
    assert.equal(cheapest.items[0].distanceToCenterLabel, undefined);
  });

  it("returns every hotel from the first through the last when all is set", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      offer(`Hotel ${index + 1}`, index, `${index} كم`),
    );
    const full = JSON.parse(
      serializeSearchResult({
        provider: "hotelbeds",
        liveMode: true,
        kind: "hotel",
        rankedBy: "cheapest",
        all: true,
        limit: 100,
        rows,
      }),
    );
    assert.equal(full.countReturned, 12);
    assert.equal(full.hasMore, false);
    assert.equal(full.items[0].name, "Hotel 1");
    assert.equal(full.items[11].name, "Hotel 12");

    const firstPage = JSON.parse(
      serializeSearchResult({
        provider: "hotelbeds",
        liveMode: true,
        kind: "hotel",
        rankedBy: "cheapest",
        rows,
      }),
    );
    assert.equal(firstPage.countReturned, 5);
    assert.equal(firstPage.hasMore, true);
  });
});
