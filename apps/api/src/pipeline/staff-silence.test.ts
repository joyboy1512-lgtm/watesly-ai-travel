import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STAFF_SILENCE_MS, staffSilenceDecision } from "./staff-silence";

const t0 = Date.parse("2026-11-04T00:00:00.000Z");

describe("staffSilenceDecision", () => {
  it("waits while the employee still has time to answer", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + STAFF_SILENCE_MS - 1,
      handoffAtMs: t0,
      lastInboundAtMs: t0,
      lastStaffReplyAtMs: null,
      lastOutboundAtMs: null,
    });
    assert.deepEqual(decision, {
      returnToAssistant: false,
      answerPendingCustomer: false,
    });
  });

  it("returns an unanswered customer message to the assistant", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + STAFF_SILENCE_MS,
      handoffAtMs: t0,
      lastInboundAtMs: t0,
      lastStaffReplyAtMs: null,
      lastOutboundAtMs: null,
    });
    assert.deepEqual(decision, {
      returnToAssistant: true,
      answerPendingCustomer: true,
    });
  });

  it("does not repeat a question the bot already answered before the handoff", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + 60_000 + STAFF_SILENCE_MS,
      handoffAtMs: t0 + 60_000,
      lastInboundAtMs: t0,
      lastStaffReplyAtMs: null,
      lastOutboundAtMs: t0 + 30_000,
    });
    assert.deepEqual(decision, {
      returnToAssistant: true,
      answerPendingCustomer: false,
    });
  });

  it("keeps the chat with the employee for three minutes after their reply", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + 10_000 + STAFF_SILENCE_MS - 1,
      handoffAtMs: t0,
      lastInboundAtMs: t0,
      lastStaffReplyAtMs: t0 + 10_000,
      lastOutboundAtMs: t0 + 10_000,
    });
    assert.equal(decision.returnToAssistant, false);
  });

  it("returns the chat after the employee stops replying", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + 10_000 + STAFF_SILENCE_MS,
      handoffAtMs: t0,
      lastInboundAtMs: t0,
      lastStaffReplyAtMs: t0 + 10_000,
      lastOutboundAtMs: t0 + 10_000,
    });
    assert.deepEqual(decision, {
      returnToAssistant: true,
      answerPendingCustomer: false,
    });
  });

  it("starts a fresh three minutes when the customer writes after the employee", () => {
    const decision = staffSilenceDecision({
      nowMs: t0 + 120_000 + STAFF_SILENCE_MS,
      handoffAtMs: t0,
      lastInboundAtMs: t0 + 120_000,
      lastStaffReplyAtMs: t0 + 10_000,
      lastOutboundAtMs: t0 + 10_000,
    });
    assert.deepEqual(decision, {
      returnToAssistant: true,
      answerPendingCustomer: true,
    });
  });
});
