import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { inferHotelPropertyType } from "./hotel-display";

describe("inferHotelPropertyType", () => {
  it("keeps an explicit non-hotel type", () => {
    assert.equal(inferHotelPropertyType({ propertyType: "resort", name: "City Hotel" }), "resort");
  });

  it("reads Hotelbeds apartment categories", () => {
    assert.equal(
      inferHotelPropertyType({ categoryCode: "APTH", categoryName: "Aparthotel 3*" }),
      "apartment",
    );
  });

  it("reads resort and guest-house names", () => {
    assert.equal(inferHotelPropertyType({ name: "Costa Brava Resort" }), "resort");
    assert.equal(inferHotelPropertyType({ name: "Gothic Guest House" }), "guest_house");
  });

  it("defaults to hotel", () => {
    assert.equal(inferHotelPropertyType({ categoryCode: "4EST", name: "Gran Via" }), "hotel");
  });
});
