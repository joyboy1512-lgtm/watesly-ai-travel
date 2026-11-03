/** Hand a quiet employee conversation back to the assistant after this long. */
export const STAFF_SILENCE_MS = 3 * 60 * 1000;

export type StaffSilenceDecision = {
  returnToAssistant: boolean;
  answerPendingCustomer: boolean;
};

/**
 * The employee has the chat. Return it when they have been silent for three
 * minutes: either they never answered the waiting customer, or their last
 * reply is already three minutes old.
 * Answer the customer only when nobody has replied to their latest message.
 */
export function staffSilenceDecision(input: {
  nowMs: number;
  handoffAtMs: number | null;
  lastInboundAtMs: number | null;
  lastStaffReplyAtMs: number | null;
  lastOutboundAtMs: number | null;
}): StaffSilenceDecision {
  const staffHasLatestWord =
    input.lastStaffReplyAtMs != null &&
    (input.lastInboundAtMs == null ||
      input.lastStaffReplyAtMs >= input.lastInboundAtMs);

  if (staffHasLatestWord && input.lastStaffReplyAtMs != null) {
    const silent = input.nowMs - input.lastStaffReplyAtMs >= STAFF_SILENCE_MS;
    return { returnToAssistant: silent, answerPendingCustomer: false };
  }

  const customerIsWaiting =
    input.lastInboundAtMs != null &&
    (input.lastOutboundAtMs == null ||
      input.lastInboundAtMs > input.lastOutboundAtMs);

  if (customerIsWaiting && input.lastInboundAtMs != null) {
    const due = input.nowMs - input.lastInboundAtMs >= STAFF_SILENCE_MS;
    return { returnToAssistant: due, answerPendingCustomer: due };
  }

  const anchor = input.handoffAtMs ?? input.lastOutboundAtMs;
  if (anchor == null) {
    return { returnToAssistant: false, answerPendingCustomer: false };
  }
  return {
    returnToAssistant: input.nowMs - anchor >= STAFF_SILENCE_MS,
    answerPendingCustomer: false,
  };
}
