import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  aggregationLabelAr,
  aggregationScore,
  parseTravelAggregationSettings,
} from "./aggregation";
import {
  hotelPropertyFingerprint,
  hotelsLikelySame,
  normalizeHotelName,
  haversineMeters,
} from "./hotel-mapping";

describe("normalizeHotelName", () => {
  it("strips generic words and punctuation", () => {
    assert.equal(normalizeHotelName("The Address Dubai Mall Hotel"), "address dubai mall");
    assert.equal(normalizeHotelName("فندق العنوان دبي"), "العنوان دبي");
  });
});

describe("hotelPropertyFingerprint", () => {
  it("prefers GIATA when present", () => {
    assert.equal(
      hotelPropertyFingerprint({
        providerKey: "hotelbeds",
        raw: { giataId: "12345", name: "A" },
      }),
      "giata:12345",
    );
    assert.equal(
      hotelPropertyFingerprint({
        providerKey: "webbeds",
        raw: { giataId: "12345", name: "Different Label" },
      }),
      "giata:12345",
    );
  });

  it("collapses same name + nearby coordinates across suppliers", () => {
    const a = hotelPropertyFingerprint({
      providerKey: "hotelbeds",
      description: "Address Downtown",
      raw: { name: "Address Downtown Hotel", latitude: 25.1972, longitude: 55.2744 },
    });
    const b = hotelPropertyFingerprint({
      providerKey: "ratehawk",
      description: "The Address Downtown",
      raw: { name: "The Address Downtown", latitude: 25.1973, longitude: 55.2745 },
    });
    assert.equal(a, b);
  });
});

describe("hotelsLikelySame", () => {
  it("matches nearby same-name properties", () => {
    assert.equal(
      hotelsLikelySame(
        {
          providerKey: "hotelbeds",
          raw: { name: "Atlantis The Palm", latitude: 25.1306, longitude: 55.1171 },
        },
        {
          providerKey: "tbo",
          raw: { name: "Atlantis The Palm Hotel", latitude: 25.1307, longitude: 55.1172 },
        },
      ),
      true,
    );
  });

  it("does not match distant hotels with the same brand word", () => {
    assert.equal(
      hotelsLikelySame(
        {
          providerKey: "hotelbeds",
          raw: { name: "Hilton Garden Inn", latitude: 25.2, longitude: 55.27 },
        },
        {
          providerKey: "webbeds",
          raw: { name: "Hilton Garden Inn", latitude: 24.45, longitude: 54.37 },
        },
      ),
      false,
    );
  });
});

describe("haversineMeters", () => {
  it("is ~0 for identical points", () => {
    assert.ok(haversineMeters(25.2, 55.27, 25.2, 55.27) < 1);
  });
});

describe("parseTravelAggregationSettings", () => {
  it("defaults to cheapest", () => {
    const s = parseTravelAggregationSettings(null);
    assert.equal(s.hotel.mode, "cheapest");
    assert.equal(s.flight.mode, "cheapest");
  });

  it("reads nested travel.aggregation", () => {
    const s = parseTravelAggregationSettings({
      travel: {
        aggregation: {
          hotel: { mode: "preferred", preferredProviderKey: "Hotelbeds" },
          flight: { mode: "cheapest" },
        },
      },
    });
    assert.equal(s.hotel.mode, "preferred");
    assert.equal(s.hotel.preferredProviderKey, "hotelbeds");
    assert.equal(s.flight.mode, "cheapest");
  });
});

describe("aggregationLabelAr", () => {
  it("is empty for a single supplier", () => {
    assert.equal(
      aggregationLabelAr({
        matchKey: "x",
        mode: "cheapest",
        winnerProvider: "hotelbeds",
        supplierCount: 1,
        suppliers: [],
      }),
      "",
    );
  });

  it("mentions supplier count for cheapest", () => {
    assert.match(
      aggregationLabelAr({
        matchKey: "x",
        mode: "cheapest",
        winnerProvider: "hotelbeds",
        supplierCount: 3,
        suppliers: [],
      }) || "",
      /3/,
    );
  });
});

describe("aggregationScore", () => {
  it("cheapest is just the sell price", () => {
    assert.equal(
      aggregationScore("webbeds", 50, { mode: "cheapest" }),
      50,
    );
  });

  it("preferred supplier sorts ahead of a cheaper other supplier", () => {
    const preferred = aggregationScore("hotelbeds", 80, {
      mode: "preferred",
      preferredProviderKey: "hotelbeds",
    });
    const other = aggregationScore("webbeds", 50, {
      mode: "preferred",
      preferredProviderKey: "hotelbeds",
    });
    assert.ok(preferred < other);
  });
});
