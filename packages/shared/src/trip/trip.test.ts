import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { tripSearchButtonLabel } from "./labels";
import { validateServicesSelected, validateTraveler } from "./validation";
import { buildRepriceResult } from "./reprice";
import { buildPackageOptions, createEmptyTripDraft } from "./index";

describe("tripSearchButtonLabel", () => {
  it("requires at least one service", () => {
    assert.equal(tripSearchButtonLabel([]), "اختر خدمة واحدة على الأقل");
  });

  it("single service labels", () => {
    assert.equal(tripSearchButtonLabel(["flight"]), "ابحث عن الرحلات");
    assert.equal(tripSearchButtonLabel(["hotel"]), "ابحث عن الفنادق");
  });

  it("flight + hotel bundle", () => {
    assert.equal(tripSearchButtonLabel(["flight", "hotel"]), "ابحث عن باقة طيران وفندق");
  });

  it("all four services", () => {
    assert.equal(
      tripSearchButtonLabel(["flight", "hotel", "transfer", "activity"]),
      "نظّم رحلتي كاملة",
    );
  });
});

describe("validateServicesSelected", () => {
  it("blocks empty selection", () => {
    assert.ok(validateServicesSelected([]));
  });
  it("allows selection", () => {
    assert.equal(validateServicesSelected(["flight"]), null);
  });
});

describe("validateTraveler english names", () => {
  it("rejects arabic in english name fields", () => {
    const errors = validateTraveler(
      {
        title: "Mr",
        firstNameEn: "محمد",
        lastNameEn: "Ali",
        gender: "M",
        dateOfBirth: "1990-01-01",
        nationality: "KW",
        passportNumber: "P123",
        passportExpiry: "2030-01-01",
      },
      0,
    );
    assert.ok(errors.traveler_0_firstNameEn);
  });
});

describe("buildRepriceResult", () => {
  it("detects price increase", () => {
    const result = buildRepriceResult(
      { flight: { id: "1", label: "F", sellAmountMinor: 10000, currency: "KWD" } },
      { flight: { id: "1", label: "F", sellAmountMinor: 12000, currency: "KWD" } },
    );
    assert.equal(result.status, "price_changed");
    assert.equal(result.requiresApproval, true);
  });
});

describe("buildPackageOptions", () => {
  it("builds three tiers from offers", () => {
    const draft = createEmptyTripDraft();
    draft.services = ["flight", "hotel"];
    const options = buildPackageOptions(draft, {
      flight: {
        offers: [{ id: "f1", label: "KWI-DXB", sellAmountMinor: 95000, currency: "KWD" }],
      },
      hotel: {
        offers: [{ id: "h1", label: "Atlantis", sellAmountMinor: 210000, currency: "KWD" }],
      },
    });
    assert.equal(options.length, 3);
    assert.ok(options[2].totalMinor > options[0].totalMinor);
  });
});
