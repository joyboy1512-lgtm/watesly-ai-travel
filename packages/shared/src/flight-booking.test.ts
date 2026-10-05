import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeFlightLeg,
  analyzeFarePolicy,
  buildFlightPriceBreakdown,
  classifyTravelerAge,
  deriveFlightShopLifecycle,
  extrasTotalMinor,
  holdTimerFromOffer,
  inclusionFromProvider,
  isLatinTravelName,
  isRecentValidation,
  listOfferExtras,
  parseBagAllowance,
  passportRequiredForOffer,
  splitOfferSell,
  validateFlightContact,
  validateFlightTraveler,
} from "./flight-booking";

describe("inclusionFromProvider", () => {
  it("keeps unknown vs not included distinct", () => {
    assert.equal(inclusionFromProvider(undefined).status, "unknown");
    assert.equal(inclusionFromProvider("").status, "unknown");
    assert.equal(inclusionFromProvider("غير مشمول").status, "not_included");
    assert.equal(inclusionFromProvider("حقيبة يد 7 كجم").status, "included");
  });
});

describe("parseBagAllowance", () => {
  it("reads count and weight when present", () => {
    const bags = parseBagAllowance({
      personal: "حقيبة شخصية تحت المقعد",
      cabin: "1 حقيبة 7 كجم",
      checked: "غير مشمول",
    });
    assert.equal(bags.personal.status, "included");
    assert.equal(bags.cabin.weightKg, 7);
    assert.equal(bags.checked.status, "not_included");
  });
});

describe("analyzeFlightLeg", () => {
  it("flags next-day arrival, airport change, and provider-only self-connect", () => {
    const leg = analyzeFlightLeg({
      kind: "outbound",
      stops: 1,
      durationLabel: "8س",
      segments: [
        {
          from: "KWI",
          to: "IST",
          departAt: "2026-11-02T22:10:00",
          arriveAt: "2026-11-03T02:05:00",
          airlineCode: "TK",
          operatingAirlineCode: "TK",
          flightNumber: "TK801",
        },
        {
          from: "SAW",
          to: "LHR",
          departAt: "2026-11-03T06:00:00",
          arriveAt: "2026-11-03T08:10:00",
          airlineCode: "TK",
          operatingAirlineCode: "PC",
          operatingAirlineName: "Pegas",
          flightNumber: "TK1980",
        },
      ],
      details: { selfConnect: true, separateTickets: true },
    });
    assert.equal(leg.segments[0]!.nextDayArrival, true);
    assert.equal(leg.airportChange, true);
    assert.equal(leg.selfConnect, true);
    assert.equal(leg.separateTickets, true);
    assert.equal(leg.segments[1]!.codeshare, true);
  });

  it("does not invent self-connect when the offer omits it", () => {
    const leg = analyzeFlightLeg({
      kind: "outbound",
      segments: [
        { from: "KWI", to: "DXB", departAt: "2026-11-02T08:00:00", arriveAt: "2026-11-02T10:00:00" },
      ],
    });
    assert.equal(leg.selfConnect, false);
    assert.equal(leg.separateTickets, false);
    assert.equal(leg.airportChange, false);
  });
});

describe("analyzeFarePolicy", () => {
  it("uses offer policies only", () => {
    const fare = analyzeFarePolicy({
      cabin: "economy",
      selectedFareBrand: "Saver",
      policies: { changeable: false, refundable: false, noteAr: "بدون اختيار مقعد مجاني" },
    });
    assert.equal(fare.change.status, "not_included");
    assert.equal(fare.cancel.status, "not_included");
    assert.equal(fare.noShow.status, "unknown");
    assert.deepEqual(fare.benefits, ["بدون اختيار مقعد مجاني"]);
  });
});

describe("extras and price lines", () => {
  it("lists only priced extras from the offer", () => {
    const extras = listOfferExtras({
      availableExtras: [
        { id: "bag-23", kind: "bag", labelAr: "حقيبة 23 كجم", amountMinor: 4500, currency: "KWD" },
        { id: "bad", kind: "snack", amountMinor: 100 },
      ],
    });
    assert.equal(extras.length, 1);
    assert.equal(extras[0]!.seatConfirmed, false);
    assert.equal(extrasTotalMinor(extras), 4500);
  });

  it("does not double-count ticket and tax when the offer splits them", () => {
    const split = splitOfferSell({ baseAmountMinor: 80000, taxesAmountMinor: 12000 }, 92000);
    const bd = buildFlightPriceBreakdown({
      ticketsMinor: split.ticketsMinor,
      taxesMinor: split.taxesMinor,
      extrasMinor: 4500,
      currency: "KWD",
    });
    assert.equal(bd.totalMinor, 96500);
  });

  it("keeps a hold timer off unless the provider guarantees one", () => {
    assert.equal(holdTimerFromOffer({ expiresAt: "2026-11-02T10:00:00Z" }).show, false);
    assert.equal(
      holdTimerFromOffer({ holdGuaranteed: true, holdExpiresAt: "2026-11-02T10:00:00Z" }).show,
      true,
    );
  });
});

describe("passengers", () => {
  it("validates Latin names, age class, and contact", () => {
    assert.equal(isLatinTravelName("Ahmed Ali"), true);
    assert.equal(isLatinTravelName("أحمد"), false);
    assert.equal(classifyTravelerAge(1), "infant");
    assert.equal(classifyTravelerAge(8), "child");
    const errors = validateFlightTraveler(
      {
        type: "adult",
        firstName: "Ahmed",
        lastName: "Ali",
        birthDate: "2020-01-01",
        gender: "male",
        nationality: "KW",
      },
      "2026-11-02",
      false,
    );
    assert.ok(errors.birthDate);
    const contact = validateFlightContact({ name: "", email: "bad", phone: "12" });
    assert.ok(contact.contactName && contact.email && contact.phone);
  });

  it("needs passport number, nationality and expiry but not the issue date", () => {
    const base = {
      type: "adult" as const,
      firstName: "AHMED",
      lastName: "ALSABAH",
      birthDate: "1988-04-12",
      gender: "male" as const,
      nationality: "KW",
      passportNumber: "P1234567",
      passportExpiry: "2030-01-01",
    };
    assert.deepEqual(validateFlightTraveler(base, "2026-11-20", true), {});
    assert.ok(
      validateFlightTraveler({ ...base, passportIssueDate: "2020-01" }, "2026-11-20", true)
        .passportIssueDate,
    );
    assert.ok(
      validateFlightTraveler({ ...base, passportExpiry: "2026-10-01" }, "2026-11-20", true)
        .passportExpiry,
    );
  });

  it("requires a passport unless the offer says otherwise", () => {
    assert.equal(passportRequiredForOffer({}), true);
    assert.equal(passportRequiredForOffer({ requiresPassport: false }), false);
  });
});

describe("lifecycle", () => {
  it("never marks ticketed without tickets or a real issue", () => {
    assert.equal(
      deriveFlightShopLifecycle({ shopLifecycle: "ticketed", paymentStatus: "paid" }),
      "needs_followup",
    );
    assert.equal(
      deriveFlightShopLifecycle({
        bookingStatus: "ticketed",
        providerRef: "PNR-1",
        tickets: [{ ticketNumber: "176-123" }],
      }),
      "ticketed",
    );
    assert.equal(
      deriveFlightShopLifecycle({ paymentStatus: "paid", bookingStatus: "on_hold" }),
      "needs_followup",
    );
  });

  it("treats a fresh validatedAt as recent", () => {
    assert.equal(isRecentValidation(new Date().toISOString()), true);
    assert.equal(isRecentValidation("2000-01-01T00:00:00.000Z"), false);
  });
});
