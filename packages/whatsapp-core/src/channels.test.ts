import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { phoneNumberIdsMatch } from "./channels";

describe("phone number id matching", () => {
  it("matches the same Meta id with spaces or punctuation", () => {
    assert.equal(phoneNumberIdsMatch("111222333444555", "111222333444555"), true);
    assert.equal(phoneNumberIdsMatch("111 222 333 444 555", "111222333444555"), true);
  });

  it("does not treat a short or different id as the same number", () => {
    assert.equal(phoneNumberIdsMatch("123456", "123 456"), false);
    assert.equal(phoneNumberIdsMatch("111222333444555", "999888777666555"), false);
    assert.equal(phoneNumberIdsMatch("mock_phone", "111222333444555"), false);
  });
});
