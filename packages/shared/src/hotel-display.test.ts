import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dedupeHotelRates,
  inferHotelPropertyType,
  mergeHotelRoomsByCode,
  type HotelRateOption,
  type HotelRoomOption,
} from "./hotel-display";
import { translateRoomNameAr, uniqueShopRooms } from "./hotel-offer-normalizer";

describe("inferHotelPropertyType", () => {
  it("keeps an explicit non-hotel type", () => {
    assert.equal(inferHotelPropertyType({ propertyType: "resort", name: "City Hotel" }), "resort");
  });

  it("reads Hotelbeds apartment categories", () => {
    assert.equal(
      inferHotelPropertyType({ categoryCode: "APTH", categoryName: "Aparthotel 3*" }),
      "apartment",
    );
  });

  it("reads resort and guest-house names", () => {
    assert.equal(inferHotelPropertyType({ name: "Costa Brava Resort" }), "resort");
    assert.equal(inferHotelPropertyType({ name: "Gothic Guest House" }), "guest_house");
  });

  it("defaults to hotel", () => {
    assert.equal(inferHotelPropertyType({ categoryCode: "4EST", name: "Gran Via" }), "hotel");
  });
});

function rate(partial: Partial<HotelRateOption> & { rateKey: string }): HotelRateOption {
  return {
    rateType: "BOOKABLE",
    roomCode: "DBL.DX",
    roomName: "Double deluxe",
    boardCode: "RO",
    boardName: "Room only",
    net: 45.653,
    currency: "KWD",
    freeCancellation: false,
    cancellationPolicies: [],
    promotions: [],
    rooms: 1,
    ...partial,
  };
}

describe("dedupeHotelRates", () => {
  it("keeps one row when Hotelbeds repeats the same offer", () => {
    const unique = dedupeHotelRates([
      rate({ rateKey: "key-a", net: 45.653, boardCode: "RO" }),
      rate({ rateKey: "key-b", net: 45.653, boardCode: "RO" }),
      rate({ rateKey: "key-c", net: 51.5, boardCode: "BB" }),
    ]);
    assert.equal(unique.length, 2);
    assert.equal(unique.filter((r) => r.boardCode === "RO").length, 1);
  });

  it("prefers a bookable rate over a recheck clone", () => {
    const unique = dedupeHotelRates([
      rate({ rateKey: "recheck", rateType: "RECHECK", allotment: 4 }),
      rate({ rateKey: "book", rateType: "BOOKABLE", allotment: 2 }),
    ]);
    assert.equal(unique.length, 1);
    assert.equal(unique[0]?.rateKey, "book");
  });
});

describe("mergeHotelRoomsByCode", () => {
  it("merges the same room code and drops duplicate rates", () => {
    const rooms: HotelRoomOption[] = [
      { code: "FAM.ST", name: "Family", rates: [rate({ rateKey: "a", roomCode: "FAM.ST" })] },
      { code: "FAM.ST", name: "Family", rates: [rate({ rateKey: "b", roomCode: "FAM.ST" })] },
    ];
    const merged = mergeHotelRoomsByCode(rooms);
    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.rates.length, 1);
  });
});

describe("translateRoomNameAr", () => {
  it("keeps deluxe superior distinct from deluxe", () => {
    assert.equal(translateRoomNameAr("DOUBLE DELUXE SUPERIOR").ar, "غرفة مزدوجة ديلوكس سوبيريور");
    assert.equal(translateRoomNameAr("DOUBLE DELUXE").ar, "غرفة مزدوجة ديلوكس");
  });
});

describe("uniqueShopRooms", () => {
  it("collapses rooms that share the Arabic name and the same offer set", () => {
    const rooms: HotelRoomOption[] = [
      {
        code: "DBL.ST",
        name: "DOUBLE STANDARD",
        rates: [rate({ rateKey: "a", roomCode: "DBL.ST", roomName: "DOUBLE STANDARD" })],
      },
      {
        code: "STD.DB",
        name: "STANDARD DOUBLE",
        rates: [rate({ rateKey: "b", roomCode: "STD.DB", roomName: "STANDARD DOUBLE" })],
      },
    ];
    const unique = uniqueShopRooms(rooms);
    assert.equal(unique.length, 1);
    assert.equal(unique[0]?.rates.length, 1);
  });

  it("keeps deluxe superior when its price differs from deluxe", () => {
    const rooms: HotelRoomOption[] = [
      {
        code: "DBL.DX",
        name: "DOUBLE DELUXE",
        rates: [rate({ rateKey: "dx", roomCode: "DBL.DX", roomName: "DOUBLE DELUXE", net: 45 })],
      },
      {
        code: "DBL.DX-SU",
        name: "DOUBLE DELUXE SUPERIOR",
        rates: [
          rate({
            rateKey: "su",
            roomCode: "DBL.DX-SU",
            roomName: "DOUBLE DELUXE SUPERIOR",
            net: 61,
          }),
        ],
      },
    ];
    const unique = uniqueShopRooms(rooms);
    assert.equal(unique.length, 2);
  });
});
