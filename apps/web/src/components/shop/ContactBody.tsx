"use client";

import Link from "next/link";
import { applyCmsVars, cmsContactOf, pickLocalized } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import { useShopCms } from "@/components/shop/ShopCmsProvider";

export function ContactBody() {
  const { t, locale } = useShopI18n();
  const cms = useShopCms();
  const contact = cmsContactOf(cms);
  const legal = pickLocalized(locale, contact.legalNameAr, contact.legalNameEn);
  const intro = pickLocalized(locale, cms.sitePages.contactIntroAr, cms.sitePages.contactIntroEn);

  return (
    <>
      {intro ? <p>{applyCmsVars(intro, { legal, brand: "WeekendGate" })}</p> : null}
      <ul className="shop-contact-list">
        <li>
          <strong>{t("legalCompany")}:</strong> {legal}
        </li>
        <li>
          <strong>{t("legalPhone")}:</strong>{" "}
          <a href={`tel:${contact.phoneE164}`}>{contact.phoneDisplay}</a>
        </li>
        <li>
          <strong>{t("whatsapp")}:</strong>{" "}
          <a href={contact.whatsappUrl} target="_blank" rel="noreferrer">
            {contact.phoneDisplay}
          </a>
        </li>
        <li>
          <strong>{t("legalEmail")}:</strong>{" "}
          <a href={`mailto:${contact.supportEmail}`}>{contact.supportEmail}</a>
        </li>
        <li>
          <strong>{t("legalAddress")}:</strong>{" "}
          {pickLocalized(locale, contact.addressAr, contact.addressEn)}
        </li>
        <li>
          <strong>{t("legalHours")}:</strong>{" "}
          {pickLocalized(locale, contact.hoursAr, contact.hoursEn)}
        </li>
        <li>
          <strong>{t("legalLicense")}:</strong> {contact.tourismLicense}
        </li>
      </ul>
      <p>
        {t("moreHelp")}: <Link href="/bookings/manage">{t("manageBooking")}</Link> ·{" "}
        <Link href="/faq">{t("navFaq")}</Link>
      </p>
    </>
  );
}
