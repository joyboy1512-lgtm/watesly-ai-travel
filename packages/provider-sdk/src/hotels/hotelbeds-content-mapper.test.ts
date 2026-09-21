import assert from "node:assert/strict";
import test from "node:test";
import { enrichDetailsFromContent } from "./hotelbeds-content-mapper";
import type { HotelPropertyDetails } from "@watesly-travel/shared";

test("enrichDetailsFromContent maps Hotelbeds amenities into filter ids", () => {
  const details = enrichDetailsFromContent({
    details: {
      name: "City Hotel",
      propertyType: "hotel",
      facilities: [],
      facilityLabels: [],
      categoryCode: "4EST",
    } as unknown as HotelPropertyDetails,
    content: {
      facilities: [
        { facilityGroupCode: 70, facilityCode: 550, description: { content: "Wi-Fi" } },
        {
          facilityGroupCode: 70,
          facilityCode: 320,
          description: { content: "Outdoor swimming pool" },
        },
        { facilityGroupCode: 70, facilityCode: 470, description: { content: "Gym" } },
        { facilityGroupCode: 70, facilityCode: 620, description: { content: "Spa centre" } },
      ],
    },
  });
  assert.ok(details.facilities?.includes("wifi"));
  assert.ok(details.facilities?.includes("pool"));
  assert.ok(details.facilities?.includes("gym"));
  assert.ok(details.facilities?.includes("spa"));
});
