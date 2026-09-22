import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HOTEL_SEARCH_DEFAULT_BACKDROP, hotelSearchBackdrop } from "./hotel-search-backdrop";

describe("hotelSearchBackdrop", () => {
  it("uses the navy-gold site vista", () => {
    assert.equal(hotelSearchBackdrop("Barcelona"), HOTEL_SEARCH_DEFAULT_BACKDROP);
    assert.equal(hotelSearchBackdrop("دبي"), HOTEL_SEARCH_DEFAULT_BACKDROP);
    assert.equal(hotelSearchBackdrop(""), HOTEL_SEARCH_DEFAULT_BACKDROP);
    assert.match(HOTEL_SEARCH_DEFAULT_BACKDROP, /hotel-search-navy-gold/);
  });
});
