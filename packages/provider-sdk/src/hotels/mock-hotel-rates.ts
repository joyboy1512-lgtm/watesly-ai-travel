import type { HotelRateOption, HotelRoomOption } from "@watesly-travel/shared";
import { boardLabelAr } from "@watesly-travel/shared";
import type { MockHotelTemplate } from "./mock-hotel-catalog";

const BOARD_VARIANTS = [
  { code: "RO", mult: 1 },
  { code: "BB", mult: 1.14 },
  { code: "HB", mult: 1.32 },
] as const;

function roomVariants(hotel: MockHotelTemplate) {
  return [
    { code: "STD", name: hotel.roomType, mult: 1 },
    {
      code: "DLX",
      name: hotel.roomType.includes("ديلوكس")
        ? hotel.roomType
        : `${hotel.roomType} · ديلوكس`,
      mult: 1.2,
    },
    { code: "STE", name: "جناح", mult: 1.55 },
  ];
}

export function buildMockHotelRateTree(input: {
  hotel: MockHotelTemplate;
  providerOfferRef: string;
  nightMajor: number;
  currency: string;
  nights: number;
  seed: number;
}): { rooms: HotelRoomOption[]; rateOptions: HotelRateOption[] } {
  const { hotel, providerOfferRef, nightMajor, currency, nights, seed } = input;
  const rooms: HotelRoomOption[] = [];
  const rateOptions: HotelRateOption[] = [];
  let idx = 0;

  for (const room of roomVariants(hotel)) {
    const mappedRates: HotelRateOption[] = [];
    for (const board of BOARD_VARIANTS) {
      const nightNet = Number((nightMajor * room.mult * board.mult).toFixed(3));
      const net = Number((nightNet * nights).toFixed(3));
      const freeCancellation = hotel.freeCancellation && board.code !== "RO";
      const paymentType = hotel.noPrepayment ? "AT_HOTEL" : "AT_WEB";
      const rateKey = `${providerOfferRef}-${room.code}-${board.code}-${idx}`;
      idx += 1;
      const rate: HotelRateOption = {
        rateKey,
        rateType: hotel.scenario === "unavailable" ? "RECHECK" : "BOOKABLE",
        roomCode: room.code,
        roomName: room.name,
        boardCode: board.code,
        boardName: boardLabelAr(board.code),
        net,
        netBasis: "stay",
        currency,
        paymentType,
        freeCancellation,
        cancellationPolicies: freeCancellation
          ? [
              {
                amount: 0,
                currency,
                from: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
              },
            ]
          : [
              {
                amount: net,
                currency,
                from: new Date().toISOString(),
              },
            ],
        taxes: {
          allIncluded: true,
          items: [{ type: "TAX", amount: 0, currency, included: true }],
        },
        promotions:
          seed % 3 === 0 && board.code === "BB"
            ? [{ name: "عرض إفطار مجاني", remark: "Mock promotion" }]
            : [],
        allotment: Math.max(0, hotel.roomsAvailable - idx % 3),
        dailyRates: Array.from({ length: nights }, (_, offset) => ({
          offset,
          net: nightNet,
        })),
      };
      mappedRates.push(rate);
      rateOptions.push(rate);
    }
    if (mappedRates.length) {
      rooms.push({
        code: room.code,
        name: room.name,
        rates: mappedRates.sort((a, b) => a.net - b.net),
        imageUrl: `https://placehold.co/480x320/0b3d4a/e8c27a?text=${encodeURIComponent(room.name.slice(0, 20))}`,
        facilities:
          room.code === "STE"
            ? ["إنترنت", "تلفزيون", "خزنة", "ميني بار"]
            : room.code === "DLX"
              ? ["إنترنت", "تلفزيون", "خزنة"]
              : ["إنترنت", "تلفزيون"],
      });
    }
  }

  rateOptions.sort((a, b) => a.net - b.net);
  rooms.sort(
    (a, b) => (a.rates[0]?.net ?? Infinity) - (b.rates[0]?.net ?? Infinity),
  );

  return { rooms, rateOptions };
}
