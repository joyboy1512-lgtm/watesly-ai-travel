import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeOrgAiSettings,
  publicAssistantEnabled,
  readOrgAiSettings,
} from "../src/ai/org-ai-settings.ts";

test("a missing flag leaves the public assistant on", () => {
  assert.equal(publicAssistantEnabled({}), true);
  assert.equal(publicAssistantEnabled({ ai: { defaultThreadCreditUsd: null } }), true);
  assert.equal(publicAssistantEnabled({ ai: { assistantEnabled: false } }), false);
});

test("reading a credit limit keeps the site switch", () => {
  const parsed = readOrgAiSettings({
    ai: { defaultThreadCreditUsd: null, assistantEnabled: false },
  });
  assert.equal(parsed.defaultThreadCreditUsd, null);
  assert.equal(parsed.assistantEnabled, false);
});

test("saving only the switch does not clear the credit limit", () => {
  const next = mergeOrgAiSettings(
    { brand: "WeekendGate", ai: { defaultThreadCreditUsd: 2.5, assistantEnabled: true } },
    { assistantEnabled: false },
  ) as { brand: string; ai: { defaultThreadCreditUsd: number; assistantEnabled: boolean } };
  assert.equal(next.brand, "WeekendGate");
  assert.equal(next.ai.defaultThreadCreditUsd, 2.5);
  assert.equal(next.ai.assistantEnabled, false);
});

test("saving only the credit limit does not change the switch", () => {
  const next = mergeOrgAiSettings(
    { ai: { defaultThreadCreditUsd: 1, assistantEnabled: false } },
    { defaultThreadCreditUsd: 4 },
  ) as { ai: { defaultThreadCreditUsd: number; assistantEnabled: boolean } };
  assert.equal(next.ai.defaultThreadCreditUsd, 4);
  assert.equal(next.ai.assistantEnabled, false);
});
