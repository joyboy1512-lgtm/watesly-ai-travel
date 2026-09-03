"use client";

import { COMPANY_LEGAL, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export function AboutBody() {
  const { t, locale } = useShopI18n();
  const legal = pickLocalized(locale, COMPANY_LEGAL.legalNameAr, COMPANY_LEGAL.legalNameEn);
  return (
    <>
      <p>
        {t("aboutLead", {
          brand: COMPANY_LEGAL.brandName,
          legal,
        })}
      </p>
      <p>
        {pickLocalized(locale, COMPANY_LEGAL.roleClarificationAr, COMPANY_LEGAL.roleClarificationEn)}
      </p>
      <h2>{t("legalData")}</h2>
      <ul>
        <li>
          <strong>{t("legalCompany")}:</strong> {legal}
        </li>
        <li>
          <strong>{t("legalAddress")}:</strong> {t("address")}
        </li>
        <li>
          <strong>{t("legalPhone")}:</strong> {COMPANY_LEGAL.phoneDisplay}
        </li>
        <li>
          <strong>{t("whatsapp")}:</strong> {COMPANY_LEGAL.phoneDisplay}
        </li>
        <li>
          <strong>{t("legalEmail")}:</strong> {COMPANY_LEGAL.supportEmail}
        </li>
        <li>
          <strong>{t("legalHours")}:</strong> {t("hours")}
        </li>
        <li>
          <strong>{t("legalLicense")}:</strong> {COMPANY_LEGAL.tourismLicense}
        </li>
      </ul>
    </>
  );
}
