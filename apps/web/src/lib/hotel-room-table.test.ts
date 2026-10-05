import assert from "node:assert/strict";
import test from "node:test";
import {
  cheapestBreakfastRateKey,
  guestCountForRate,
  parseRoomSize,
  pickRoomFacts,
} from "./hotel-room-table";
import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";

function rate(partial: Partial<HotelRateOption> & { rateKey: string }): HotelRateOption {
  return {
    rateType: "BOOKABLE",
    roomCode: "DBL",
    roomName: "Superior Double",
    boardCode: "RO",
    boardName: "Room only",
    net: 100,
    currency: "SAR",
    freeCancellation: true,
    cancellationPolicies: [],
    promotions: [],
    ...partial,
  };
}

test("parseRoomSize reads metric area", () => {
  assert.equal(parseRoomSize("26.0 m²"), "26.0 m²");
  assert.equal(parseRoomSize("غرفة 28 متر مربع"), "28 m²");
  assert.equal(parseRoomSize("no size here"), null);
});

test("cheapestBreakfastRateKey picks the lowest breakfast board", () => {
  const key = cheapestBreakfastRateKey([
    rate({ rateKey: "ro", boardCode: "RO", net: 80 }),
    rate({ rateKey: "bb-hi", boardCode: "BB", net: 140 }),
    rate({ rateKey: "bb-lo", boardCode: "BB", net: 110 }),
    rate({ rateKey: "hb", boardCode: "HB", net: 160 }),
  ]);
  assert.equal(key, "bb-lo");
});

test("guestCountForRate prefers rate occupancy then room max", () => {
  const room: HotelRoomOption = {
    code: "DBL",
    name: "Superior",
    rates: [],
    occupancy: { maxPax: 3 },
  };
  assert.equal(guestCountForRate(rate({ rateKey: "a", adults: 2, children: 1 }), room), 3);
  assert.equal(guestCountForRate(rate({ rateKey: "b" }), room), 3);
});

test("pickRoomFacts keeps size, bed, access, aircon, wifi first", () => {
  const facts = pickRoomFacts({
    code: "DBL",
    name: "Superior Double",
    rates: [],
    description: "26.0 m²",
    facilities: [
      "1 full bed and 1 sofa bed",
      "Accessible by wheelchair",
      "Air conditioning",
      "Free WiFi",
      "Mini bar",
    ],
  });
  assert.equal(facts[0], "26.0 m²");
  assert.ok(facts.some((f) => /sofa bed/i.test(f)));
  assert.ok(facts.some((f) => /wheelchair/i.test(f)));
  assert.ok(facts.some((f) => /air/i.test(f)));
  assert.ok(facts.some((f) => /wifi/i.test(f)));
});
