"use client";

import { applyCmsVars, cmsContactOf, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function AboutBody() {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const contact = cmsContactOf(cms);
  const legal = pickLocalized(locale, contact.legalNameAr, contact.legalNameEn);
  const lead = applyCmsVars(
    pickLocalized(locale, cms.sitePages.aboutLeadAr, cms.sitePages.aboutLeadEn),
    { brand: "WeekendGate", legal },
  );
  const body = pickLocalized(locale, cms.sitePages.aboutBodyAr, cms.sitePages.aboutBodyEn);

  return (
    <>
      <p>{lead}</p>
      {body ? <p>{body}</p> : null}
      <h2>{t("legalData")}</h2>
      <ul>
        <li>
          <strong>{t("legalCompany")}:</strong> {legal}
        </li>
        <li>
          <strong>{t("legalAddress")}:</strong>{" "}
          {pickLocalized(locale, contact.addressAr, contact.addressEn)}
        </li>
        <li>
          <strong>{t("legalPhone")}:</strong> {contact.phoneDisplay}
        </li>
        <li>
          <strong>{t("whatsapp")}:</strong> {contact.phoneDisplay}
        </li>
        <li>
          <strong>{t("legalEmail")}:</strong> {contact.supportEmail}
        </li>
        <li>
          <strong>{t("legalHours")}:</strong>{" "}
          {pickLocalized(locale, contact.hoursAr, contact.hoursEn)}
        </li>
        <li>
          <strong>{t("legalLicense")}:</strong> {contact.tourismLicense}
        </li>
      </ul>
    </>
  );
}
