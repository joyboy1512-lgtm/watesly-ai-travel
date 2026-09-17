"use client";

import Link from "next/link";
import { pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function ArticlesIndexClient() {
  const { locale } = useShopI18n();
  const cms = useShopCms();
  const articles = cms.articles.filter((row) => row.published);

  if (!articles.length) {
    return <p>{locale === "en" ? "No published articles yet." : "لا توجد مقالات منشورة بعد."}</p>;
  }

  return (
    <div className="shop-article-list">
      {articles.map((row) => (
        <article key={row.id} className="shop-faq-item" style={{ padding: "1rem 0" }}>
          <h2 style={{ margin: "0 0 0.4rem" }}>
            <Link href={`/articles/${row.slug}`}>
              {pickLocalized(locale, row.titleAr, row.titleEn)}
            </Link>
          </h2>
          <p style={{ margin: 0, color: "#5d7270" }}>
            {pickLocalized(locale, row.bodyAr, row.bodyEn).slice(0, 160)}
            {pickLocalized(locale, row.bodyAr, row.bodyEn).length > 160 ? "…" : ""}
          </p>
        </article>
      ))}
    </div>
  );
}
