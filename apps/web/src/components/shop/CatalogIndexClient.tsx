"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  commerceWhatsAppLink,
  formatCommercePrice,
  pickLocalized,
  type MetaCommerceState,
} from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export function CatalogIndexClient() {
  const { locale } = useShopI18n();
  const [state, setState] = useState<MetaCommerceState | null>(null);

  useEffect(() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
    fetch(`${apiBase}/shop/platform/commerce`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setState(data as MetaCommerceState);
      })
      .catch(() => undefined);
  }, []);

  const products = (state?.products || []).filter((row) => row.active);
  const title = state
    ? pickLocalized(locale, state.catalogNameAr, state.catalogNameEn)
    : locale === "en"
      ? "WhatsApp catalog"
      : "كتالوج واتساب";
  const lead = state
    ? pickLocalized(locale, state.catalogLeadAr, state.catalogLeadEn)
    : "";

  return (
    <>
      <header className="shop-inner-hero">
        <div className="shop-inner-hero-inner">
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
      </header>
      <div className="wg-platform">
        <div className="wg-platform-grid">
          {products.map((product) => {
            const name = pickLocalized(locale, product.nameAr, product.nameEn);
            const desc = pickLocalized(locale, product.descriptionAr, product.descriptionEn);
            const wa = state ? commerceWhatsAppLink(state, product) : "#";
            return (
              <article key={product.id} className="wg-platform-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={name} />
                <div className="body">
                  <h2>{name}</h2>
                  <p style={{ margin: 0, color: "#1565c0", fontSize: "0.78rem", fontWeight: 700 }}>
                    {product.category === "flight"
                      ? locale === "en" ? "Flight" : "طيران"
                      : product.category === "hotel"
                        ? locale === "en" ? "Hotel" : "فندق"
                        : product.category === "transfer"
                          ? locale === "en" ? "Transfer" : "نقل"
                          : product.category === "activity"
                            ? locale === "en" ? "Activity" : "نشاط"
                            : locale === "en" ? "Offer" : "عرض"}
                  </p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>{desc}</p>
                  <div className="wg-price-row">
                    <span className="now">{formatCommercePrice(product.priceMinor, product.currency)}</span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                    <a className="wg-btn" href={wa} target="_blank" rel="noreferrer">
                      {locale === "en" ? "Order on WhatsApp" : "اطلب عبر واتساب"}
                    </a>
                    {product.url ? (
                      <Link className="wg-btn secondary" href={product.url}>
                        {locale === "en" ? "Details" : "التفاصيل"}
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {!products.length ? (
          <p className="shop-legal-body">{locale === "en" ? "Catalog is being prepared." : "الكتالوج قيد التجهيز."}</p>
        ) : null}
      </div>
    </>
  );
}
