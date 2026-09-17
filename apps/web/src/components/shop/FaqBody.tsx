"use client";

import { cmsContactOf, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function FaqBody() {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const contact = cmsContactOf(cms);
  const intro = pickLocalized(locale, cms.sitePages.faqIntroAr, cms.sitePages.faqIntroEn);
  const items = cms.faqs.map((row) => ({
    q: pickLocalized(locale, row.questionAr, row.questionEn),
    a: pickLocalized(locale, row.answerAr, row.answerEn),
    cat: pickLocalized(locale, row.categoryAr || "", row.categoryEn || ""),
  }));

  return (
    <>
      {intro ? <p>{intro}</p> : null}
      {items.map((item) => (
        <details key={item.q} className="shop-faq-item">
          <summary>
            {item.cat ? <span className="shop-faq-cat">{item.cat}</span> : null} {item.q}
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
      <p>
        {t("moreHelp")}:{" "}
        <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
          {t("whatsapp")}
        </a>{" "}
        · <a href="/bookings/manage">{t("manageBooking")}</a> ·{" "}
        <a href="/contact">{t("navContact")}</a>
      </p>
    </>
  );
}
