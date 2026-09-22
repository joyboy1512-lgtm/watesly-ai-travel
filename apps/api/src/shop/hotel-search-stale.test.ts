import assert from "node:assert/strict";
import test from "node:test";
import {
  isShopHotelQuotaError,
  mapQuoteItemsToHotelRows,
} from "./hotel-search-stale";

test("isShopHotelQuotaError matches Hotelbeds string 403 and Arabic", () => {
  assert.equal(isShopHotelQuotaError("Hotelbeds Hotels: Hotelbeds HTTP 403"), true);
  assert.equal(isShopHotelQuotaError("Quota exceeded"), true);
  assert.equal(isShopHotelQuotaError("تم تجاوز حد طلبات مزود الفنادق التجريبي مؤقتًا."), true);
  assert.equal(isShopHotelQuotaError("مزود الفنادق غير متاح مؤقتًا (CIRCUIT_OPEN)."), true);
  assert.equal(isShopHotelQuotaError("لا توجد عروض متاحة"), false);
});

test("mapQuoteItemsToHotelRows keeps snapshot details", () => {
  const rows = mapQuoteItemsToHotelRows(
    [
      {
        providerOfferRef: "hb-1",
        description: "Test Hotel",
        sellAmount: 12000,
        costAmount: 10000,
        expiresAt: new Date("2026-09-22T19:00:00Z"),
        rawOfferSnapshot: { hotelName: "Test Hotel", stars: 4 },
      },
      {
        providerOfferRef: "skip",
        description: "bad",
        sellAmount: 1,
        costAmount: 1,
        expiresAt: null,
        rawOfferSnapshot: null,
      },
    ],
    "EUR",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, "hb-1");
  assert.equal(rows[0]?.details.stars, 4);
  assert.equal(rows[0]?.currency, "EUR");
});
