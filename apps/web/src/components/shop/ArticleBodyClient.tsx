"use client";

import Link from "next/link";
import { pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function ArticleBodyClient({ slug }: { slug: string }) {
  const { locale } = useShopI18n();
  const cms = useShopCms();
  const article = cms.articles.find((row) => row.slug === slug && row.published);

  if (!article) {
    return (
      <p>
        {locale === "en" ? "Article not found." : "المقال غير موجود."}{" "}
        <Link href="/articles">{locale === "en" ? "Back to journal" : "العودة للمقالات"}</Link>
      </p>
    );
  }

  return (
    <article>
      <h2 style={{ marginTop: 0 }}>{pickLocalized(locale, article.titleAr, article.titleEn)}</h2>
      {pickLocalized(locale, article.bodyAr, article.bodyEn)
        .split(/\n{2,}/)
        .map((para, idx) => (
          <p key={idx}>{para}</p>
        ))}
    </article>
  );
}
