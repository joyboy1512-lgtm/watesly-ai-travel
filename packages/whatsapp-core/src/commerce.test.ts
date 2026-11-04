import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogCtaPayload,
  buildInteractiveButtonsPayload,
  buildInteractiveListPayload,
  buildMultiProductPayload,
  buildSingleProductPayload,
} from "./commerce";
import { parseInboundWebhook } from "./index";
import { parseHotelPickRowId } from "./hotel-pick";

describe("WhatsApp commerce payloads", () => {
  it("builds a single product message", () => {
    const payload = buildSingleProductPayload({
      to: "96590053224",
      catalogId: "cat-1",
      productRetailerId: "dubai-weekend",
      body: "عطلة دبي",
    });
    assert.equal(payload.type, "interactive");
    assert.equal(payload.interactive.type, "product");
    assert.equal(payload.interactive.action.catalog_id, "cat-1");
    assert.equal(payload.interactive.action.product_retailer_id, "dubai-weekend");
  });

  it("builds a multi-product list", () => {
    const payload = buildMultiProductPayload({
      to: "96590053224",
      catalogId: "cat-1",
      header: "WeekendGate",
      sectionTitle: "عروض نهاية الأسبوع",
      productRetailerIds: ["dubai-weekend", "bahrain-weekend"],
    });
    assert.equal(payload.interactive.type, "product_list");
    assert.equal(payload.interactive.action.sections[0]?.product_items.length, 2);
  });

  it("builds a catalog CTA", () => {
    const payload = buildCatalogCtaPayload({
      to: "96590053224",
      body: "تصفّح الكتالوج",
      button: "فتح",
      url: "https://www.weekendgate.com/catalog",
    });
    assert.equal(payload.interactive.type, "cta_url");
    assert.equal(payload.interactive.action.parameters.url, "https://www.weekendgate.com/catalog");
  });

  it("clips a tappable hotel list to WhatsApp limits", () => {
    const longName = "فندق قريب جداً من المسجد الحرام رويال";
    const payload = buildInteractiveListPayload({
      to: "96590053224",
      header: "الفنادق",
      body: "اضغط على الفندق لعرض الغرف والسعر.",
      button: "اختر الفندق من القائمة الآن",
      sectionTitle: "الأقرب إلى الحرم",
      footer: "أو اكتب اسم الفندق",
      rows: [
        ...Array.from({ length: 12 }, (_, i) => ({
          id: `hotel:hb-${i + 1}`,
          title: i === 0 ? longName : `فندق ${i + 1}`,
          description:
            i === 0
              ? "0.4 كم · من 120.50 KWD · 5★ وهذه زيادة طويلة جداً يجب أن تُقص عند حد واتساب للوصف"
              : `من ${i + 1}0 KWD`,
        })),
      ],
    });
    const rows = payload.interactive.action.sections[0]?.rows || [];
    assert.equal(payload.interactive.type, "list");
    assert.equal(rows.length, 10);
    assert.equal(Array.from(rows[0]!.title).length, 24);
    assert.equal(rows[0]!.title, Array.from(longName).slice(0, 24).join(""));
    assert.equal(Array.from(rows[0]!.description || "").length, 72);
    assert.equal(Array.from(payload.interactive.action.button).length, 20);
    assert.equal(rows[0]!.id, "hotel:hb-1");
    const lined = buildInteractiveListPayload({
      to: "96590053224",
      body: "مكة\nمن 1 ديسمبر إلى 4 ديسمبر\nبالغان\n\n1. فندق الصفوة",
      button: "اختر الفندق",
      sectionTitle: "النتائج",
      rows: [{ id: "hotel:hb-1", title: "فندق الصفوة" }],
    });
    assert.match(lined.interactive.body.text, /مكة\nمن 1 ديسمبر/);
    assert.match(lined.interactive.body.text, /\n1\. فندق الصفوة/);
  });

  it("reads a hotel tap as the row title and keeps the hotel id", () => {
    const messages = parseInboundWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "123" },
                contacts: [{ wa_id: "96590053224", profile: { name: "عميل" } }],
                messages: [
                  {
                    from: "96590053224",
                    id: "wamid.1",
                    type: "interactive",
                    interactive: {
                      type: "list_reply",
                      list_reply: {
                        id: "hotel:hb-99",
                        title: "فندق الصفوة",
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    assert.equal(messages[0]?.text, "فندق الصفوة");
    assert.equal(messages[0]?.replyId, "hotel:hb-99");
    assert.equal(parseHotelPickRowId(messages[0]?.replyId), "hb-99");
    assert.equal(parseHotelPickRowId("not-a-hotel"), null);
    assert.equal(parseHotelPickRowId("hotels:more"), null);
  });

  it("parses an inbound WhatsApp catalog order", () => {
    const messages = parseInboundWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: "pn-1" },
                contacts: [{ wa_id: "96590053224", profile: { name: "عميل" } }],
                messages: [
                  {
                    from: "96590053224",
                    id: "wamid.order",
                    type: "order",
                    order: {
                      catalog_id: "cat-1",
                      text: "أريد هذا العرض",
                      product_items: [{ product_retailer_id: "dubai-weekend", quantity: 1 }],
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0]!.text || "", /طلب كتالوج/);
    assert.match(messages[0]!.text || "", /أريد هذا العرض/);
  });

  it("keeps an invisible button body and the button title", () => {
    const payload = buildInteractiveButtonsPayload({
      to: "96590053224",
      body: "\u2060",
      buttons: [{ id: "hotels:more", title: "المزيد" }],
    });
    assert.equal(payload.interactive.body.text, "\u2060");
    assert.equal(payload.interactive.action.buttons[0]?.reply.title, "المزيد");
  });

  it("stacks the hotel choice and more buttons on one card", () => {
    const payload = buildInteractiveButtonsPayload({
      to: "96590053224",
      header: "الفنادق",
      body: "\u202D🏨 *Sol Pyramids Inn* ★4\u202C\n\u200F💰 السعر يبدأ من",
      buttons: [
        { id: "hotels:choose", title: "اختر الفندق" },
        { id: "hotels:more", title: "المزيد" },
      ],
    });
    assert.equal(payload.interactive.header?.text, "الفنادق");
    assert.equal(payload.interactive.action.buttons[0]?.reply.title, "اختر الفندق");
    assert.equal(payload.interactive.action.buttons[1]?.reply.title, "المزيد");
    assert.match(payload.interactive.body.text, /\u202D🏨/);
    assert.match(payload.interactive.body.text, /\u200F💰/);
  });
});
