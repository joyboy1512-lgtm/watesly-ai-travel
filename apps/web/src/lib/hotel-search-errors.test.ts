import assert from "node:assert/strict";
import test from "node:test";
import { humanizeHotelSearchError } from "./hotel-search-errors";

test("humanizeHotelSearchError maps Hotelbeds quota", () => {
  const msg = humanizeHotelSearchError("The quota has been exceeded.");
  assert.match(msg, /تجاوز حد طلبات/);
  assert.doesNotMatch(msg, /quota has been exceeded/i);
});

test("humanizeHotelSearchError keeps Arabic messages", () => {
  assert.equal(
    humanizeHotelSearchError("حدد عمر كل طفل قبل البحث"),
    "حدد عمر كل طفل قبل البحث",
  );
});
