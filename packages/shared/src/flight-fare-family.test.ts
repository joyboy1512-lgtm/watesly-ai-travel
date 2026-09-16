import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  extractFareFamilyFromRaw,
  fareFamilyKey,
  normalizeFareBrandKey,
  pickDefaultFareOption,
  toFlightFareOption,
  type FlightFareOption,
} from "./flight-fare-family";

describe("normalizeFareBrandKey", () => {
  it("maps Jazeera and Kuwait Airways brand names", () => {
    assert.equal(normalizeFareBrandKey("Flex Plus"), "flex_plus");
    assert.equal(normalizeFareBrandKey("Flex"), "flex");
    assert.equal(normalizeFareBrandKey("Comfort"), "comfort");
    assert.equal(normalizeFareBrandKey("Economy Saver"), "saver");
    assert.equal(normalizeFareBrandKey("Economy"), "economy");
    assert.equal(normalizeFareBrandKey("Economy Class"), "economy_class");
    assert.equal(normalizeFareBrandKey("Economy Flexi"), "flex");
    assert.equal(normalizeFareBrandKey("Business Saver"), "business_saver");
    assert.equal(normalizeFareBrandKey("ECOSAVER"), "saver");
  });
});

describe("extractFareFamilyFromRaw", () => {
  it("reads Duffel fare_brand_name from the nested offer", () => {
    const extracted = extractFareFamilyFromRaw({
      offer: {
        slices: [{ fare_brand_name: "Flex Plus", segments: [{ passengers: [{ cabin_class: "economy" }] }] }],
      },
    });
    assert.equal(extracted.brandKey, "flex_plus");
    assert.equal(extracted.cabin, "economy");
  });

  it("uses mapped fareBrand when present", () => {
    const extracted = extractFareFamilyFromRaw({
      fareBrand: "Economy Saver",
      cabin: "economy",
    });
    assert.equal(extracted.brandKey, "saver");
  });
});

describe("fareFamilyKey", () => {
  it("keeps saver and flex as distinct economy families", () => {
    assert.notEqual(
      fareFamilyKey("economy", "saver"),
      fareFamilyKey("economy", "flex"),
    );
  });

  it("keeps Economy and Economy Class as distinct families", () => {
    assert.notEqual(
      fareFamilyKey("economy", normalizeFareBrandKey("Economy")),
      fareFamilyKey("economy", normalizeFareBrandKey("Economy Class")),
    );
  });
});

describe("toFlightFareOption", () => {
  it("keeps the airline brand name for shop display", () => {
    const option = toFlightFareOption({
      id: "off_1",
      providerKey: "duffel",
      sellAmountMinor: 45000,
      currency: "KWD",
      raw: { fareBrand: "Comfort", cabin: "economy" },
    });
    assert.equal(option.brandKey, "comfort");
    assert.match(option.brandNameAr, /Comfort/);
  });
});

describe("pickDefaultFareOption", () => {
  it("prefers the itinerary winner over the cheapest family", () => {
    const options = [
      { id: "saver", brandKey: "saver", cabin: "economy", sellAmountMinor: 1 },
      { id: "biz", brandKey: "business_saver", cabin: "business", sellAmountMinor: 9 },
    ] as unknown as FlightFareOption[];
    const picked = pickDefaultFareOption(options, "biz", "business");
    assert.equal(picked?.id, "biz");
  });
});
