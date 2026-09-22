import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupHotelSuggests, hotelSuggestBadge } from "./hotel-suggest";

describe("groupHotelSuggests", () => {
  it("puts cities first and hotels in the other-results group", () => {
    const grouped = groupHotelSuggests([
      { id: "c1", code: "CAI", title: "Cairo", kind: "city" },
      { id: "h1", code: "123", title: "Sofitel Cairo", kind: "hotel" },
      { id: "p1", code: "CAI", title: "New Cairo", kind: "place" },
      { id: "h2", code: "456", title: "Marriott", kind: "hotel" },
    ]);
    assert.deepEqual(
      grouped.destinations.map((i) => i.id),
      ["c1", "p1"],
    );
    assert.deepEqual(
      grouped.hotels.map((i) => i.id),
      ["h1", "h2"],
    );
  });
});

describe("hotelSuggestBadge", () => {
  it("labels apartments and villas from the name", () => {
    assert.equal(hotelSuggestBadge("Cairo World Trade Center Hotel & Residences", "hotel"), "hotel");
    assert.equal(hotelSuggestBadge("Downtown Nile Apartment", "hotel"), "apartment");
    assert.equal(hotelSuggestBadge("Giza Villa", "hotel"), "villa");
    assert.equal(hotelSuggestBadge("Cairo", "city"), "region");
  });
});
