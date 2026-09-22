import assert from "node:assert/strict";
import test from "node:test";
import { hotelbedsResponseError, isHotelbedsQuotaError } from "./hotelbeds-errors";

test("hotelbedsResponseError reads string error (quota 403)", () => {
  assert.equal(hotelbedsResponseError({ error: "Quota exceeded" }, 403), "Quota exceeded");
});

test("hotelbedsResponseError reads nested error.message", () => {
  assert.equal(
    hotelbedsResponseError({ error: { message: "The quota has been exceeded." } }, 403),
    "The quota has been exceeded.",
  );
});

test("hotelbedsResponseError falls back to HTTP status", () => {
  assert.equal(hotelbedsResponseError({}, 403), "Hotelbeds HTTP 403");
});

test("isHotelbedsQuotaError matches Hotelbeds quota wording", () => {
  assert.equal(isHotelbedsQuotaError("Quota exceeded"), true);
  assert.equal(isHotelbedsQuotaError("The quota has been exceeded."), true);
  assert.equal(isHotelbedsQuotaError("Hotelbeds HTTP 403"), false);
  assert.equal(isHotelbedsQuotaError("تم تجاوز حد طلبات مزود الفنادق التجريبي مؤقتًا."), true);
});
