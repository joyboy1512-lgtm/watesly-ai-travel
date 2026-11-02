import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildMetaStatusMessage,
  buildMetaTemplateComponents,
  deriveAccountStatus,
  fetchWabaSubscribedApps,
  formatTierHint,
  isMockToken,
  matchWabaPhoneNumber,
  normalizeTemplateName,
  parsePhoneHealth,
  parseWabaHealth,
  resolveEffectiveNameStatus,
  subscribeWabaWebhook,
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

describe("meta-ops webhook activation", () => {
  it("does not report a mock token as a live webhook", async () => {
    const subscribed = await subscribeWabaWebhook({
      accessToken: "mock",
      wabaId: "1234567890",
    });
    assert.equal(subscribed.ok, false);
    assert.equal(subscribed.mock, true);

    const missingWaba = await subscribeWabaWebhook({
      accessToken: "EAABxx",
      wabaId: "  ",
    });
    assert.equal(missingWaba.ok, false);
    assert.equal(missingWaba.mock, false);

    const apps = await fetchWabaSubscribedApps({
      accessToken: "mock_dev",
      wabaId: "1234567890",
    });
    assert.equal(apps.ok, false);
    assert.equal(apps.subscribed, false);
  });

  it("matches a display number to the Meta phone number id", () => {
    const phones = [
      { id: "111222333444555", displayPhone: "+965 9005 3224", verifiedName: "Travel Zone" },
      { id: "999888777666555", displayPhone: "+965 5000 0000" },
    ];
    assert.equal(
      matchWabaPhoneNumber(phones, { phoneNumberId: "111222333444555" })?.id,
      "111222333444555",
    );
    assert.equal(
      matchWabaPhoneNumber(phones, {
        phoneNumberId: "+965 9005 3224",
        displayPhone: "90053224",
      })?.id,
      "111222333444555",
    );
    assert.equal(
      matchWabaPhoneNumber(phones, { phoneNumberId: "123", displayPhone: "555" }),
      null,
    );
    assert.equal(
      matchWabaPhoneNumber(
        [{ id: "111222333444555", displayPhone: "+965 9005 3224" }],
        { phoneNumberId: "not-a-phone" },
      )?.id,
      "111222333444555",
    );
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
