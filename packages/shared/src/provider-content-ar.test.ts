import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  arabicAdultCount,
  arabicChildCount,
  arabicGuestCount,
  arabicNightCount,
  arabicNightWord,
  arabicRoomCount,
  arabicTravelerCount,
  normalizeAccessibilityLabelAr,
  normalizeAirlineNameAr,
  normalizeBedTypeAr,
  normalizeBoardLabelAr,
  normalizeBookingStatusAr,
  normalizeCancelPolicyAr,
  normalizeCityNameAr,
  normalizePaymentTypeAr,
  scrubEnglishFragmentInAr,
} from "./provider-content-ar";

describe("provider-content-ar plurals", () => {
  it("formats nights without double numbers", () => {
    assert.equal(arabicNightCount(1), "ليلة واحدة");
    assert.equal(arabicNightCount(2), "ليلتان");
    assert.equal(arabicNightCount(7), "7 ليالٍ");
    assert.equal(arabicNightWord(7), "ليالٍ");
  });

  it("formats rooms, adults, children, guests, travelers", () => {
    assert.equal(arabicRoomCount(2), "غرفتان");
    assert.equal(arabicAdultCount(3), "3 بالغون");
    assert.equal(arabicChildCount(2), "طفلان");
    assert.equal(arabicGuestCount(5), "5 ضيوف");
    assert.equal(arabicTravelerCount(1), "مسافر واحد");
  });
});

describe("provider-content-ar labels", () => {
  it("normalizes board and payment", () => {
    assert.equal(normalizeBoardLabelAr("BB").ar, "إفطار");
    assert.equal(normalizeBoardLabelAr("Room Only").ar, "غرفة فقط");
    assert.equal(normalizePaymentTypeAr("AT_HOTEL").ar, "الدفع في مكان الإقامة");
  });

  it("normalizes bed, city, airline, cancel, accessibility", () => {
    assert.equal(normalizeBedTypeAr("Twin Room").ar, "غرفة بسريرين منفصلين");
    assert.equal(normalizeBedTypeAr("Double").ar, "غرفة مزدوجة");
    assert.equal(normalizeCityNameAr("DXB").ar, "دبي");
    assert.equal(normalizeAirlineNameAr("EK").ar, "طيران الإمارات");
    assert.equal(normalizeCancelPolicyAr({ kind: "non_refundable" }).ar, "غير قابل للاسترداد");
    assert.equal(normalizeCancelPolicyAr({ kind: "non_refundable_now" }).ar, "غير قابل للاسترداد الآن");
    assert.equal(
      normalizeAccessibilityLabelAr("Wheelchair accessible").ar,
      "مرافق مهيأة لسهولة الوصول",
    );
    assert.equal(normalizeBookingStatusAr("CONFIRMED").ar, "مؤكد");
  });

  it("scrubs English fragments in Arabic sentences", () => {
    assert.match(scrubEnglishFragmentInAr("يشمل Room Only"), /غرفة فقط/);
    assert.match(scrubEnglishFragmentInAr("Non-Refundable"), /غير قابل للاسترداد/);
  });
});
