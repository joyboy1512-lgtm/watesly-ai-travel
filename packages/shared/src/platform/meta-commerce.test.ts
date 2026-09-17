import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  commerceWhatsAppLink,
  DEFAULT_META_COMMERCE,
  normalizeMetaCommerce,
} from "./meta-commerce";

describe("normalizeMetaCommerce", () => {
  it("fills defaults when settings are empty", () => {
    const next = normalizeMetaCommerce({});
    assert.equal(next.catalogNameAr, DEFAULT_META_COMMERCE.catalogNameAr);
    assert.ok(next.products.length > 0);
  });

  it("keeps a staff catalog id and builds a wa.me link", () => {
    const next = normalizeMetaCommerce({
      metaCatalogId: "12345",
      whatsappPhone: "+965 90053224",
      products: DEFAULT_META_COMMERCE.products,
    });
    assert.equal(next.metaCatalogId, "12345");
    assert.equal(next.whatsappPhone, "96590053224");
    const link = commerceWhatsAppLink(next, next.products[0]!);
    assert.match(link, /^https:\/\/wa\.me\/96590053224\?text=/);
  });
});
