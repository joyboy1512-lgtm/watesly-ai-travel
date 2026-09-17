/** Meta WhatsApp Commerce catalog — staff-editable, optional Graph sync. */

export type MetaProductCategory =
  | "deal"
  | "flight"
  | "hotel"
  | "transfer"
  | "activity"
  | "other";

export type MetaCommerceProduct = {
  id: string;
  retailerId: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  priceMinor: number;
  currency: string;
  image: string;
  url: string;
  category: MetaProductCategory;
  availability: "in stock" | "out of stock";
  active: boolean;
  sourceType: "manual" | "cms_deal";
  sourceId?: string;
  metaProductId?: string;
};

export type MetaCommerceState = {
  catalogNameAr: string;
  catalogNameEn: string;
  catalogLeadAr: string;
  catalogLeadEn: string;
  metaCatalogId: string;
  whatsappPhone: string;
  products: MetaCommerceProduct[];
  lastSyncedAt?: string;
  lastSyncError?: string;
  updatedAt: string;
};

export const DEFAULT_META_COMMERCE: MetaCommerceState = {
  catalogNameAr: "كتالوج WeekendGate",
  catalogNameEn: "WeekendGate catalog",
  catalogLeadAr: "عروض طيران وإقامة ونقل جاهزة للطلب عبر واتساب.",
  catalogLeadEn: "Flight, stay, and transfer offers ready to order on WhatsApp.",
  metaCatalogId: "",
  whatsappPhone: "96590053224",
  products: [
    {
      id: "prod-dubai-weekend",
      retailerId: "dubai-weekend",
      nameAr: "عطلة دبي نهاية الأسبوع",
      nameEn: "Dubai Weekend",
      descriptionAr: "طيران + فندق 4★ + نقل المطار — مغادرة من الكويت.",
      descriptionEn: "Flight + 4★ hotel + airport transfer from Kuwait.",
      priceMinor: 199_000,
      currency: "KWD",
      image: "/media/destinations/dubai.jpg?v=1",
      url: "/deals/dubai-weekend",
      category: "deal",
      availability: "in stock",
      active: true,
      sourceType: "cms_deal",
      sourceId: "deal-dubai-weekend",
    },
    {
      id: "prod-bahrain-weekend",
      retailerId: "bahrain-weekend",
      nameAr: "البحرين أقرب عطلة",
      nameEn: "Bahrain getaway",
      descriptionAr: "رحلة قصيرة من الكويت مع إقامة مريحة.",
      descriptionEn: "A short trip from Kuwait with a comfortable stay.",
      priceMinor: 129_000,
      currency: "KWD",
      image: "/media/destinations/bahrain.jpg?v=2",
      url: "/deals",
      category: "deal",
      availability: "in stock",
      active: true,
      sourceType: "manual",
    },
    {
      id: "prod-vip-transfer",
      retailerId: "vip-airport-transfer",
      nameAr: "نقل VIP من المطار",
      nameEn: "VIP airport transfer",
      descriptionAr: "من مطار الكويت إلى فندقك أو منزلك.",
      descriptionEn: "From Kuwait airport to your hotel or home.",
      priceMinor: 18_000,
      currency: "KWD",
      image: "/media/offers/transfer.jpg?v=1",
      url: "/#search",
      category: "transfer",
      availability: "in stock",
      active: true,
      sourceType: "manual",
    },
  ],
  updatedAt: new Date(0).toISOString(),
};

export function normalizeMetaCommerce(raw: unknown): MetaCommerceState {
  const src = raw && typeof raw === "object" ? (raw as Partial<MetaCommerceState>) : {};
  return {
    catalogNameAr: src.catalogNameAr?.trim() || DEFAULT_META_COMMERCE.catalogNameAr,
    catalogNameEn: src.catalogNameEn?.trim() || DEFAULT_META_COMMERCE.catalogNameEn,
    catalogLeadAr: src.catalogLeadAr?.trim() || DEFAULT_META_COMMERCE.catalogLeadAr,
    catalogLeadEn: src.catalogLeadEn?.trim() || DEFAULT_META_COMMERCE.catalogLeadEn,
    metaCatalogId: typeof src.metaCatalogId === "string" ? src.metaCatalogId.trim() : "",
    whatsappPhone:
      typeof src.whatsappPhone === "string" && src.whatsappPhone.trim()
        ? src.whatsappPhone.replace(/[^\d]/g, "")
        : DEFAULT_META_COMMERCE.whatsappPhone,
    products: Array.isArray(src.products) ? src.products : DEFAULT_META_COMMERCE.products,
    lastSyncedAt: typeof src.lastSyncedAt === "string" ? src.lastSyncedAt : undefined,
    lastSyncError: typeof src.lastSyncError === "string" ? src.lastSyncError : undefined,
    updatedAt:
      typeof src.updatedAt === "string" && src.updatedAt
        ? src.updatedAt
        : new Date().toISOString(),
  };
}

export function activeCommerceProducts(state: MetaCommerceState) {
  return state.products.filter((row) => row.active && row.availability !== "out of stock");
}

export function commerceWhatsAppLink(state: MetaCommerceState, product: MetaCommerceProduct) {
  const phone = state.whatsappPhone || DEFAULT_META_COMMERCE.whatsappPhone;
  const text = encodeURIComponent(
    `مرحباً WeekendGate، أريد طلب: ${product.nameAr} (${product.retailerId})`,
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export function formatCommercePrice(minor: number, currency = "KWD") {
  return `${(minor / 1000).toFixed(3)} ${currency}`;
}
