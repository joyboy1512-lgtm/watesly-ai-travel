import assert from "node:assert/strict";
import test from "node:test";
import {
  collectFilterFacets,
  defaultHotelFilters,
  filterHotelOffers,
  type HotelOfferRow,
} from "./hotel-search";

function rate(partial: {
  rateKey: string;
  net: number;
  boardCode?: string;
  paymentType?: string;
  freeCancellation?: boolean;
  roomName?: string;
}) {
  return {
    rateKey: partial.rateKey,
    rateType: "BOOKABLE",
    roomCode: "DBL",
    roomName: partial.roomName || "Deluxe Double",
    boardCode: partial.boardCode || "RO",
    boardName: partial.boardCode || "RO",
    net: partial.net,
    currency: "EUR",
    paymentType: partial.paymentType || "AT_WEB",
    freeCancellation: Boolean(partial.freeCancellation),
    cancellationPolicies: [],
    promotions: [],
  };
}

function hotel(partial: {
  id: string;
  name: string;
  stars?: number;
  propertyType?: string;
  categoryName?: string;
  facilities?: string[];
  facilityLabels?: string[];
  zoneName?: string;
  guestRatingScore?: number;
  distanceToCenterKm?: number;
  nights?: number;
  rates: ReturnType<typeof rate>[];
  sellAmountMinor?: number;
}): HotelOfferRow {
  return {
    id: partial.id,
    description: partial.name,
    sellAmountMinor: partial.sellAmountMinor ?? 12000,
    costAmountMinor: 10000,
    currency: "EUR",
    details: {
      name: partial.name,
      stars: partial.stars ?? 4,
      propertyType: partial.propertyType,
      categoryName: partial.categoryName,
      facilities: partial.facilities || [],
      facilityLabels: partial.facilityLabels || [],
      zoneName: partial.zoneName || "Eixample",
      guestRatingScore: partial.guestRatingScore,
      distanceToCenterKm: partial.distanceToCenterKm,
      nights: partial.nights ?? 2,
      rateOptions: partial.rates,
      rooms: [
        {
          code: "DBL",
          name: partial.rates[0]?.roomName || "Deluxe Double",
          facilities: ["حمام خاص", "مكيف هواء"],
          rates: partial.rates,
        },
      ],
    },
  };
}

const catalog = [
  hotel({
    id: "hb-novotel",
    name: "Novotel Barcelona City",
    stars: 4,
    facilities: ["wifi", "pool", "gym"],
    facilityLabels: ["واي فاي", "مسبح", "صالة رياضية", "خزنة الفندق"],
    guestRatingScore: 8.4,
    distanceToCenterKm: 2.1,
    rates: [
      rate({ rateKey: "n-ro", net: 180, boardCode: "RO" }),
      rate({ rateKey: "n-bb", net: 210, boardCode: "BB", freeCancellation: true }),
    ],
  }),
  hotel({
    id: "hb-apt",
    name: "Sagrada Familia Apartments",
    stars: 3,
    categoryName: "Aparthotel 3*",
    facilityLabels: ["واي فاي", "موقف سيارات"],
    guestRatingScore: 7.2,
    distanceToCenterKm: 1.4,
    rates: [rate({ rateKey: "a-ro", net: 140, boardCode: "RO", paymentType: "AT_HOTEL" })],
  }),
  hotel({
    id: "hb-resort",
    name: "Costa Resort",
    stars: 5,
    propertyType: "resort",
    facilities: ["pool", "spa", "beach"],
    facilityLabels: ["مسبح", "سبا", "شاطئ"],
    guestRatingScore: 9.1,
    distanceToCenterKm: 8.5,
    rates: [rate({ rateKey: "r-ai", net: 320, boardCode: "AI", freeCancellation: true })],
  }),
];

test("collectFilterFacets only lists amenities present on provider offers", () => {
  const facets = collectFilterFacets(catalog);
  assert.ok(facets.facilities.some((f) => f.id === "wifi" && f.count === 2));
  assert.ok(facets.facilities.some((f) => f.id === "pool" && f.count === 2));
  assert.ok(facets.facilities.some((f) => f.id === "gym" && f.count === 1));
  assert.ok(facets.facilities.some((f) => f.id === "spa" && f.count === 1));
  assert.ok(facets.facilities.some((f) => f.label === "خزنة الفندق"));
  assert.ok(!facets.facilities.some((f) => f.id === "airport_shuttle"));
  assert.ok(facets.meals.some((m) => m.id === "BB"));
  assert.ok(facets.meals.some((m) => m.id === "AI"));
  assert.ok(facets.propertyTypes.some((p) => p.id === "apartment"));
  assert.ok(facets.propertyTypes.some((p) => p.id === "resort"));
  assert.ok(facets.brands.some((b) => b.id === "novotel"));
});

test("filterHotelOffers keeps one aggregated card and cheapest matching rate", () => {
  const rows = filterHotelOffers(
    catalog,
    { ...defaultHotelFilters(), mealTypes: ["BB"] },
    "price_asc",
  );
  assert.deepEqual(
    rows.map((h) => h.id),
    ["hb-novotel", "hb-resort"],
  );
  assert.equal(rows[0]!.matchingRates[0]!.rateKey, "n-bb");
  assert.ok(rows[0]!.matchingRates.every((r) => ["BB", "HB", "FB", "AI"].includes(r.boardCode)));
});

test("facility AND plus rate filters drop hotels with no matching inventory", () => {
  const rows = filterHotelOffers(
    catalog,
    {
      ...defaultHotelFilters(),
      facilities: ["pool", "gym"],
      freeCancellation: true,
    },
    "price_asc",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.id, "hb-novotel");
  assert.equal(rows[0]!.matchingRates[0]!.rateKey, "n-bb");
});

test("property type uses Hotelbeds category when mapper left hotel as default", () => {
  const rows = filterHotelOffers(
    catalog,
    { ...defaultHotelFilters(), propertyTypes: ["apartment"] },
    "price_asc",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.id, "hb-apt");
});
