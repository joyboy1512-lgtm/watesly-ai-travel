import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOTEL_SEARCH_DEFAULT_BACKDROP, hotelSearchBackdrop } from "./hotel-search-backdrop";

describe("hotelSearchBackdrop", () => {
  it("uses a city photo for known destinations", () => {
    assert.match(hotelSearchBackdrop("دبي"), /dubai/);
    assert.match(hotelSearchBackdrop("Istanbul"), /istanbul/);
    assert.match(hotelSearchBackdrop("Paris"), /paris/);
  });

  it("falls back to a night city vista", () => {
    assert.equal(hotelSearchBackdrop("Barcelona"), HOTEL_SEARCH_DEFAULT_BACKDROP);
    assert.equal(hotelSearchBackdrop(""), HOTEL_SEARCH_DEFAULT_BACKDROP);
  });
});
