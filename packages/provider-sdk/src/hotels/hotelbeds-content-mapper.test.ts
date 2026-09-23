import assert from "node:assert/strict";
import test from "node:test";
import {
  enrichDetailsFromContent,
  formatHotelbedsFacilityLabel,
  roomSizeSqmFromFacilities,
} from "./hotelbeds-content-mapper";
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

test("formatHotelbedsFacilityLabel keeps the numeric room size", () => {
  const label = formatHotelbedsFacilityLabel({
    facilityGroupCode: 60,
    facilityCode: 295,
    number: 26,
    description: { content: "Room size (sqm)" },
  });
  assert.equal(label, "26 m²");
  assert.equal(
    roomSizeSqmFromFacilities([
      { facilityGroupCode: 60, facilityCode: 295, number: 28, description: { content: "حجم الغرفة (متر مربع)" } },
    ]),
    28,
  );
});

test("enrichDetailsFromContent copies room size onto the shop room", () => {
  const details = enrichDetailsFromContent({
    details: {
      name: "City Hotel",
      rooms: [{ code: "FAM.ST", name: "Family", rates: [] }],
    } as unknown as HotelPropertyDetails,
    content: {
      rooms: [
        {
          roomCode: "FAM.ST",
          roomFacilities: [
            {
              facilityGroupCode: 60,
              facilityCode: 295,
              number: 26,
              description: { content: "حجم الغرفة (متر مربع)" },
            },
          ],
        },
      ],
    },
  });
  assert.equal(details.rooms?.[0]?.sizeSqm, 26);
  assert.ok(details.rooms?.[0]?.facilities?.some((f) => /26/.test(f)));
});
