/**
 * Run: node --import tsx --test packages/provider-sdk/src/flights/travelport-catalog.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractFareFamilyFromRaw, normalizeFareBrandKey } from "@watesly-travel/shared";
import {
  buildTravelportSearchBody,
  mapTravelportCatalogSearch,
  travelportCabin,
  travelportCabinPreference,
} from "./travelport-catalog";
import { TravelportFlightProvider } from "./travelport-flight-provider";

const jazeeraCatalog = {
  CatalogProductOfferingsResponse: {
    transactionId: "txn_j9",
    CatalogProductOfferings: {
      CatalogProductOffering: [
        {
          id: "o1",
          Departure: "KWI",
          Arrival: "DXB",
          ProductBrandOptions: [
            {
              flightRefs: ["s1"],
              ProductBrandOffering: [
                {
                  Brand: { BrandRef: "b0" },
                  Product: [{ productRef: "p0" }],
                  BestCombinablePrice: {
                    CurrencyCode: { value: "KWD" },
                    TotalPrice: 18.5,
                  },
                  ContentSource: "GDS",
                },
                {
                  Brand: { BrandRef: "b1" },
                  Product: [{ productRef: "p1" }],
                  BestCombinablePrice: {
                    CurrencyCode: { value: "KWD" },
                    TotalPrice: 24,
                  },
                },
                {
                  Brand: { BrandRef: "b2" },
                  Product: [{ productRef: "p2" }],
                  BestCombinablePrice: {
                    CurrencyCode: { value: "KWD" },
                    TotalPrice: 29,
                  },
                },
                {
                  Brand: { BrandRef: "b3" },
                  Product: [{ productRef: "p3" }],
                  BestCombinablePrice: {
                    CurrencyCode: { value: "KWD" },
                    TotalPrice: 34,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    ReferenceList: [
      {
        "@type": "ReferenceListFlight",
        Flight: [
          {
            id: "s1",
            carrier: "J9",
            number: "123",
            duration: "PT1H40M",
            equipment: "A320",
            Departure: { location: "KWI", date: "2026-10-12", time: "08:15:00" },
            Arrival: { location: "DXB", date: "2026-10-12", time: "10:55:00" },
          },
        ],
      },
      {
        "@type": "ReferenceListProduct",
        Product: [
          {
            id: "p0",
            PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }],
          },
          {
            id: "p1",
            PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }],
          },
          {
            id: "p2",
            PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }],
          },
          {
            id: "p3",
            PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }],
          },
        ],
      },
      {
        "@type": "ReferenceListBrand",
        Brand: [
          { id: "b0", name: "Economy", BrandAttribute: [{ classification: "CarryOn", inclusion: "Included" }] },
          {
            id: "b1",
            name: "Flex",
            BrandAttribute: [
              { classification: "CarryOn", inclusion: "Included" },
              { classification: "CheckedBag", inclusion: "Included" },
              { classification: "Rebooking", inclusion: "Included" },
            ],
          },
          { id: "b2", name: "Flex Plus" },
          { id: "b3", name: "Comfort" },
        ],
      },
    ],
  },
};

const kuwaitRoundTrip = {
  transactionId: "txn_ku",
  CatalogProductOfferings: {
    CatalogProductOffering: [
      {
        id: "o2",
        ProductBrandOptions: [
          {
            flightRefs: ["s2"],
            ProductBrandOffering: [
              {
                Brand: { BrandRef: "b4" },
                Product: [{ productRef: "p4" }],
                CombinabilityCode: ["j1"],
                BestCombinablePrice: {
                  CurrencyCode: { value: "KWD" },
                  TotalPrice: 42,
                },
              },
              {
                Brand: { BrandRef: "b5" },
                Product: [{ productRef: "p5" }],
                CombinabilityCode: ["j2"],
                BestCombinablePrice: {
                  CurrencyCode: { value: "KWD" },
                  TotalPrice: 55,
                },
              },
              {
                Brand: { BrandRef: "b6" },
                Product: [{ productRef: "p6" }],
                CombinabilityCode: ["j3"],
                BestCombinablePrice: {
                  CurrencyCode: { value: "KWD" },
                  TotalPrice: 38,
                },
              },
              {
                Brand: { BrandRef: "b7" },
                Product: [{ productRef: "p7" }],
                CombinabilityCode: ["j4"],
                BestCombinablePrice: {
                  CurrencyCode: { value: "KWD" },
                  TotalPrice: 61,
                },
              },
              {
                Brand: { BrandRef: "b8" },
                Product: [{ productRef: "p8" }],
                CombinabilityCode: ["j5"],
                BestCombinablePrice: {
                  CurrencyCode: { value: "KWD" },
                  TotalPrice: 94,
                },
              },
            ],
          },
          {
            flightRefs: ["s3"],
            ProductBrandOffering: [
              { Brand: { BrandRef: "b4" }, CombinabilityCode: ["j1"] },
              { Brand: { BrandRef: "b5" }, CombinabilityCode: ["j2"] },
              { Brand: { BrandRef: "b6" }, CombinabilityCode: ["j3"] },
              { Brand: { BrandRef: "b7" }, CombinabilityCode: ["j4"] },
              { Brand: { BrandRef: "b8" }, CombinabilityCode: ["j5"] },
            ],
          },
        ],
      },
    ],
  },
  ReferenceList: [
    {
      "@type": "ReferenceListFlight",
      Flight: [
        {
          id: "s2",
          carrier: "KU",
          number: "671",
          duration: "PT1H30M",
          Departure: { location: "KWI", date: "2026-10-12", time: "07:00:00" },
          Arrival: { location: "DXB", date: "2026-10-12", time: "09:30:00" },
        },
        {
          id: "s3",
          carrier: "KU",
          number: "672",
          duration: "PT1H35M",
          Departure: { location: "DXB", date: "2026-10-16", time: "18:00:00" },
          Arrival: { location: "KWI", date: "2026-10-16", time: "18:35:00" },
        },
      ],
    },
    {
      "@type": "ReferenceListProduct",
      Product: [
        { id: "p4", PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }] },
        { id: "p5", PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }] },
        { id: "p6", PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }] },
        { id: "p7", PassengerFlight: [{ FlightProduct: [{ cabin: "Economy" }] }] },
        { id: "p8", PassengerFlight: [{ FlightProduct: [{ cabin: "Business" }] }] },
      ],
    },
    {
      "@type": "ReferenceListBrand",
      Brand: [
        { id: "b4", name: "Economy" },
        { id: "b5", name: "Economy Class" },
        { id: "b6", name: "Saver" },
        { id: "b7", name: "Flexi" },
        { id: "b8", name: "Business Saver" },
      ],
    },
  ],
};

describe("travelport cabin helpers", () => {
  it("maps GDS cabin names", () => {
    assert.equal(travelportCabin("Economy"), "economy");
    assert.equal(travelportCabin("PremiumEconomy"), "premium_economy");
    assert.equal(travelportCabin("Business"), "business");
    assert.equal(travelportCabinPreference("business"), "Business");
  });
});

describe("buildTravelportSearchBody", () => {
  it("requests journey search with branded-fare upsells", () => {
    const body = buildTravelportSearchBody({
      origin: "kwi",
      destination: "dxb",
      departDate: "2026-10-12",
      returnDate: "2026-10-16",
      adults: 1,
      children: 1,
      cabinClass: "economy",
    });
    const req = body.CatalogProductOfferingsRequest as Record<string, unknown>;
    assert.equal(body["@type"], "CatalogProductOfferingsQueryRequest");
    assert.equal(req.maxNumberOfUpsellsToReturn, 4);
    assert.equal(
      (req.CustomResponseModifiersAir as { SearchRepresentation: string }).SearchRepresentation,
      "Journey",
    );
    assert.equal((req.SearchCriteriaFlight as unknown[]).length, 2);
    assert.equal((req.PassengerCriteria as unknown[]).length, 2);
  });
});

describe("mapTravelportCatalogSearch", () => {
  it("maps Jazeera Economy / Flex / Flex Plus / Comfort as fare families", () => {
    const rows = mapTravelportCatalogSearch(jazeeraCatalog, {
      origin: "KWI",
      destination: "DXB",
      departDate: "2026-10-12",
      adults: 1,
    });
    assert.equal(rows.length, 4);
    const brands = rows.map((row) => String(row.raw.fareBrand));
    assert.deepEqual(brands, ["Economy", "Flex", "Flex Plus", "Comfort"]);
    assert.deepEqual(
      brands.map((name) => normalizeFareBrandKey(name)),
      ["economy", "flex", "flex_plus", "comfort"],
    );
    assert.equal(rows[0]?.raw.airlineCode, "J9");
    assert.equal(extractFareFamilyFromRaw(rows[1]?.raw).brandKey, "flex");
    assert.equal(extractFareFamilyFromRaw(rows[1]?.raw).changeable, true);
    assert.equal(rows[0]?.costAmountMinor, 18500);
  });

  it("pairs Kuwait Airways round-trip brands including Saver and Business Saver", () => {
    const rows = mapTravelportCatalogSearch(kuwaitRoundTrip, {
      origin: "KWI",
      destination: "DXB",
      departDate: "2026-10-12",
      returnDate: "2026-10-16",
      adults: 1,
    });
    assert.equal(rows.length, 5);
    const keys = rows.map((row) => extractFareFamilyFromRaw(row.raw).brandKey);
    assert.deepEqual(keys, ["economy", "economy_class", "saver", "flex", "business_saver"]);
    assert.equal(rows[0]?.raw.tripType, "roundtrip");
    assert.equal((rows[0]?.raw.returnSegments as unknown[])?.length, 1);
    assert.equal(extractFareFamilyFromRaw(rows[4]?.raw).cabin, "business");
  });
});

describe("TravelportFlightProvider", () => {
  it("stays offline until OAuth client credentials are present", () => {
    const keys = [
      "TRAVELPORT_USER",
      "TRAVELPORT_PASSWORD",
      "TRAVELPORT_CLIENT_ID",
      "TRAVELPORT_CLIENT_SECRET",
      "TRAVELPORT_TARGET_BRANCH",
      "TRAVELPORT_ACCESS_GROUP",
    ];
    const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    for (const key of keys) delete process.env[key];
    try {
      const empty = new TravelportFlightProvider({});
      assert.equal(empty.liveMode, false);
      const partial = new TravelportFlightProvider({
        username: "u",
        password: "p",
        targetBranch: "DU7_1G",
      });
      assert.equal(partial.liveMode, false);
      const ready = new TravelportFlightProvider({
        username: "u",
        password: "p",
        clientId: "cid",
        clientSecret: "sec",
        targetBranch: "DU7_1G",
      });
      assert.equal(ready.liveMode, true);
    } finally {
      for (const key of keys) {
        if (saved[key] == null) delete process.env[key];
        else process.env[key] = saved[key];
      }
    }
  });
});
