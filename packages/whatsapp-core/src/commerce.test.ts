import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogCtaPayload,
  buildMultiProductPayload,
  buildSingleProductPayload,
} from "./commerce";
import { parseInboundWebhook } from "./index";

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
});
