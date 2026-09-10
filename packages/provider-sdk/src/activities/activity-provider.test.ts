/**
 * Run: node --import tsx --test packages/provider-sdk/src/activities/activity-provider.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockActivityProvider } from "./mock-activity-provider";
import { stripActivityHtml, activityTypeLabelAr } from "@watesly-travel/shared";

describe("activity display helpers", () => {
  it("strips hotelbeds HTML summaries", () => {
    assert.equal(
      stripActivityHtml("<p>Desert safari</p><br/>Night show"),
      "Desert safari Night show",
    );
  });

  it("labels known activity types in Arabic", () => {
    assert.equal(activityTypeLabelAr("TOUR"), "جولة");
    assert.equal(activityTypeLabelAr("TICKET"), "تذكرة");
  });
});

describe("MockActivityProvider", () => {
  it("returns priced offers for a destination", async () => {
    const provider = new MockActivityProvider();
    const rows = await provider.searchActivities({
      destination: "DXB",
      fromDate: "2026-10-01",
      toDate: "2026-10-05",
      adults: 2,
      children: 0,
    });
    assert.ok(rows.length >= 2);
    assert.equal(provider.liveMode, false);
    assert.ok(rows.every((r) => r.costAmountMinor > 0));
    assert.ok(rows.every((r) => r.currency === "KWD"));
    assert.ok(rows[0]?.raw?.activityName);
  });
});
