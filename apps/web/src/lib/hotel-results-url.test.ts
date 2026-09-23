import assert from "node:assert/strict";
import test from "node:test";
import {
  HOTEL_STAY_CAPS,
  buildHotelDetailHref,
  clampHotelSearchParams,
  hotelDetailId,
  hotelOfferCode,
  hotelSearchPreferencesJson,
  hotelSearchRequestBody,
  isHotelSuggestItem,
  matchShopHotel,
  nightsBetween,
  parseHotelResultsSearch,
  stayWithRoomCount,
} from "./hotel-results-url";

test("hotelOfferCode strips hb- prefix", () => {
  assert.equal(hotelOfferCode("hb-326337"), "326337");
  assert.equal(hotelOfferCode("HB-326337"), "326337");
  assert.equal(hotelOfferCode("326337"), "326337");
});

test("hotelDetailId normalizes numeric Hotelbeds codes", () => {
  assert.equal(hotelDetailId("326337"), "hb-326337");
  assert.equal(hotelDetailId("hb-326337"), "hb-326337");
});

test("buildHotelDetailHref is shareable with stay spec in the query", () => {
  const href = buildHotelDetailHref("hb-326337", {
    destination: "Barcelona",
    destinationLabel: "Novotel Barcelona City",
    checkIn: "2026-09-21",
    checkOut: "2026-09-22",
    adults: 1,
    children: 0,
    infants: 0,
    rooms: 1,
  });
  assert.match(href, /^\/hotels\/hb-326337\?/);
  const q = parseHotelResultsSearch(new URLSearchParams(href.split("?")[1]));
  assert.equal(q.checkIn, "2026-09-21");
  assert.equal(q.checkOut, "2026-09-22");
  assert.equal(q.adults, 1);
  assert.equal(q.rooms, 1);
  assert.equal(q.destination, "Barcelona");
});

test("matchShopHotel finds hb- ids and raw hotelCode", () => {
  const hotels = [
    { id: "hb-100", details: { hotelCode: "100", name: "A" } },
    { id: "hb-200", details: { hotelCode: "200", name: "B" } },
  ];
  assert.equal(matchShopHotel(hotels, "hb-200")?.id, "hb-200");
  assert.equal(matchShopHotel(hotels, "200")?.id, "hb-200");
  assert.equal(matchShopHotel(hotels, "missing"), undefined);
});

test("isHotelSuggestItem detects hotel autocomplete rows", () => {
  assert.equal(
    isHotelSuggestItem({ id: "hotel-123", code: "123", subtitle: "فندق · دبي" }),
    true,
  );
  assert.equal(
    isHotelSuggestItem({ id: "city-DXB", code: "DXB", subtitle: "مدينة · الإمارات" }),
    false,
  );
});

test("hotelSearchRequestBody passes hotelCode into preferences", () => {
  const body = hotelSearchRequestBody(
    {
      destination: "Barcelona",
      destinationLabel: "Barcelona",
      checkIn: "2026-09-21",
      checkOut: "2026-09-22",
      adults: 1,
      children: 0,
      infants: 0,
      rooms: 1,
      childrenAges: "",
      occ: "",
    },
    { hotelCode: "hb-326337" },
  );
  assert.equal(body.hotelCode, "326337");
  const pref = JSON.parse(String(body.preferences)) as { hotelCode?: string };
  assert.equal(pref.hotelCode, "326337");
  const empty = hotelSearchPreferencesJson({
    destination: "دبي",
    destinationLabel: "دبي",
    checkIn: "2026-09-21",
    checkOut: "2026-09-22",
    adults: 1,
    children: 0,
    infants: 0,
    rooms: 1,
    childrenAges: "",
    occ: "",
  });
  assert.equal(JSON.parse(empty).hotelCode, undefined);
});

test("clampHotelSearchParams enforces Traveloka stay caps", () => {
  const clamped = clampHotelSearchParams({
    destination: "Dubai",
    destinationLabel: "Dubai",
    checkIn: "2026-09-21",
    checkOut: "2026-11-30",
    adults: 40,
    children: 10,
    infants: 0,
    rooms: 12,
    childrenAges: "8,8,8,8,8,8,8,8,8,8",
    occ: "",
  });
  assert.equal(clamped.rooms, HOTEL_STAY_CAPS.maxRooms);
  assert.equal(clamped.children, HOTEL_STAY_CAPS.maxChildren);
  assert.ok(clamped.adults + clamped.children <= HOTEL_STAY_CAPS.maxGuests);
  assert.ok(nightsBetween(clamped.checkIn, clamped.checkOut) <= HOTEL_STAY_CAPS.maxNights);
  assert.equal(clamped.childrenAges.split(",").length, HOTEL_STAY_CAPS.maxChildren);
});

test("parseHotelResultsSearch clamps oversize occupancy from the URL", () => {
  const q = parseHotelResultsSearch(
    new URLSearchParams({
      destination: "Barcelona",
      adults: "28",
      children: "8",
      rooms: "20",
      checkIn: "2026-09-21",
      checkOut: "2026-12-01",
    }),
  );
  assert.equal(q.rooms, 8);
  assert.equal(q.children, 6);
  assert.ok(q.adults + q.children <= 30);
  assert.ok(nightsBetween(q.checkIn, q.checkOut) <= 30);
});

test("stayWithRoomCount adds a second occupancy without forcing the same room type", () => {
  const next = stayWithRoomCount(
    {
      destination: "Dubai",
      destinationLabel: "Dubai",
      checkIn: "2026-10-20",
      checkOut: "2026-10-22",
      adults: 2,
      children: 0,
      infants: 0,
      rooms: 1,
      childrenAges: "",
      occ: "2",
    },
    2,
  );
  assert.equal(next.rooms, 2);
  assert.equal(next.adults, 2);
  assert.equal(next.occ.split("|").length, 2);
});
