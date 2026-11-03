import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveGeoLocation, resolveLandmark } from "./locations";

describe("resolveLandmark", () => {
  it("pins the Mecca Haram", () => {
    const point = resolveLandmark("فنادق قريبة من الحرم المكي");
    assert.equal(point?.label, "المسجد الحرام");
    assert.ok(point && Math.abs(point.latitude - 21.4225) < 0.001);
  });

  it("pins the Prophet's Mosque when the phrase is Medinan", () => {
    const point = resolveLandmark("الحرم النبوي");
    assert.equal(point?.label, "المسجد النبوي");
    assert.ok(point && Math.abs(point.latitude - 24.4672) < 0.001);
  });

  it("leaves an ordinary city to the city table", () => {
    assert.equal(resolveLandmark("دبي"), null);
    assert.equal(resolveGeoLocation("دبي")?.label, "دبي");
    assert.equal(resolveGeoLocation("مكة")?.label, "مكة");
  });
});
