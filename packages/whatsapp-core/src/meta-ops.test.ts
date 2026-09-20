import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMetaStatusMessage,
  buildMetaTemplateComponents,
  deriveAccountStatus,
  formatTierHint,
  isMockToken,
  normalizeTemplateName,
  parsePhoneHealth,
  parseWabaHealth,
  resolveEffectiveNameStatus,
  tierToDailyLimit,
} from "./meta-ops";

describe("meta-ops health parsers", () => {
  it("maps Meta phone health fields and messaging tiers", () => {
    const parsed = parsePhoneHealth({
      display_phone_number: "+965 5000 0000",
      verified_name: "WeekendGate",
      quality_rating: "GREEN",
      messaging_limit_tier: "TIER_2K",
      status: "CONNECTED",
      name_status: "DECLINED",
      new_name_status: "APPROVED",
    });
    assert.equal(parsed.qualityRating, "GREEN");
    assert.equal(parsed.messagingLimitTier, "TIER_2K");
    assert.equal(parsed.messagingLimit, 2000);
    assert.equal(parsed.metaNameStatus, "APPROVED");
    assert.equal(parsed.metaPhoneStatus, "CONNECTED");
  });

  it("prefers WABA entity can_send_message", () => {
    const parsed = parseWabaHealth({
      account_review_status: "APPROVED",
      health_status: {
        can_send_message: "LIMITED",
        entities: [{ entity_type: "WABA", can_send_message: "AVAILABLE" }],
      },
    });
    assert.equal(parsed.metaCanSendMessage, "AVAILABLE");
    assert.equal(parsed.metaAccountReviewStatus, "APPROVED");
  });

  it("derives disconnected/suspended from Meta flags", () => {
    assert.equal(
      deriveAccountStatus({ authError: true }),
      "disconnected",
    );
    assert.equal(
      deriveAccountStatus({ metaCanSendMessage: "BLOCKED" }),
      "suspended",
    );
    assert.equal(
      deriveAccountStatus({
        metaPhoneStatus: "CONNECTED",
        metaCanSendMessage: "AVAILABLE",
        metaNameStatus: "APPROVED",
      }),
      "connected",
    );
  });

  it("builds Arabic health messages", () => {
    assert.equal(
      buildMetaStatusMessage({
        metaPhoneStatus: "CONNECTED",
        metaNameStatus: "APPROVED",
        metaCanSendMessage: "AVAILABLE",
        metaAccountReviewStatus: "APPROVED",
      }),
      "متاح — متطابق مع Meta",
    );
    assert.match(
      buildMetaStatusMessage({ metaCanSendMessage: "BLOCKED" }),
      /تعطّل/,
    );
  });

  it("formats tier hints and mock tokens", () => {
    assert.equal(tierToDailyLimit("TIER_250"), 250);
    assert.match(formatTierHint("TIER_250", 250), /250/);
    assert.equal(isMockToken("mock_dev"), true);
    assert.equal(isMockToken("EAABxx"), false);
    assert.equal(resolveEffectiveNameStatus("DECLINED", "PENDING"), "PENDING");
  });
});

describe("meta-ops templates", () => {
  it("normalizes template names for Meta", () => {
    assert.equal(normalizeTemplateName("Welcome Offer!!"), "welcome_offer");
    assert.throws(() => normalizeTemplateName("***"));
  });

  it("builds Meta components from local template fields", () => {
    const components = buildMetaTemplateComponents({
      name: "welcome_offer",
      body: "مرحباً {{1}}، عرضك جاهز",
      header: "WeekendGate",
      footer: "إلغاء الرد STOP",
      headerType: "text",
    });
    assert.equal(components[0]?.type, "HEADER");
    assert.equal(components[1]?.type, "BODY");
    assert.deepEqual(
      (components[1] as { example?: { body_text: string[][] } }).example?.body_text[0],
      ["مثال"],
    );
    assert.equal(components[2]?.type, "FOOTER");
  });
});
