"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  clearShopSession,
  getShopSession,
  shopFetch,
  type ShopCustomer,
} from "@/lib/shop-session";
import { WeekendGateLogo } from "@/components/shop/WeekendGateLogo";
import {
  COMPANY_LEGAL,
  SHOP_LOCALE_LABEL,
  type ShopCurrency,
  type ShopLocale,
} from "@watesly-travel/shared";
import { platformEnabled } from "@/lib/platform-flags";
import { ShopI18nProvider, useShopI18n } from "@/components/shop/ShopI18nProvider";

const ShopAssistant = dynamic(
  () => import("@/components/shop/ShopAssistant").then((m) => m.ShopAssistant),
  { ssr: false },
);

const BRAND = "WeekendGate";

type ShopBootstrap = {
  brand?: string;
  productBrand?: string;
  currency?: string;
  timezone?: string;
};

function StoreFrontInner({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const { t, locale, currency, setLocale, setCurrency, locales, currencies } = useShopI18n();
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<ShopBootstrap | null>(null);

  useEffect(() => {
    setCustomer(getShopSession()?.customer || null);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    shopFetch<ShopBootstrap>("/shop/bootstrap", { auth: false })
      .then(setBootstrap)
      .catch(() => undefined);
  }, []);

  function logout() {
    clearShopSession();
    setCustomer(null);
    window.location.href = "/";
  }

  const isEn = locale === "en";
  const operatingName = bootstrap?.brand?.trim() || COMPANY_LEGAL.legalNameAr;

  return (
    <div className="shop-root exp-theme" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <header className="shop-header exp-header exp-header-white">
        <div className="shop-header-inner exp-header-inner">
          <Link href="/" className="shop-brand exp-brand" aria-label="WeekendGate">
            <WeekendGateLogo />
          </Link>

          <nav className="exp-header-links" aria-label={t("navMenu")}>
            {platformEnabled() ? (
              <>
                <Link href="/deals">{t("navDeals")}</Link>
                <Link href="/destinations">{t("navDestinations")}</Link>
                <Link href="/trip-builder">{t("navTripBuilder")}</Link>
              </>
            ) : null}
            <Link href="/about">{t("navAbout")}</Link>
            <Link href="/booking-policy">{t("navPolicy")}</Link>
            <Link href="/faq">{t("navFaq")}</Link>
            <Link href="/contact">{t("navContact")}</Link>
          </nav>

          <button
            type="button"
            className="shop-menu-toggle exp-menu-toggle exp-menu-toggle-dark"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {t("navMenu")}
          </button>

          <nav className={`exp-util-nav${menuOpen ? " open" : ""}`}>
            {platformEnabled() ? (
              <>
                <Link href="/deals" className="exp-util-link mobile-only">
                  {t("navDeals")}
                </Link>
                <Link href="/destinations" className="exp-util-link mobile-only">
                  {t("navDestinations")}
                </Link>
                <Link href="/trip-builder" className="exp-util-link mobile-only">
                  {t("navTripBuilder")}
                </Link>
              </>
            ) : null}
            <Link href="/about" className="exp-util-link mobile-only">
              {t("navAbout")}
            </Link>
            <Link href="/booking-policy" className="exp-util-link mobile-only">
              {t("navPolicy")}
            </Link>
            <Link href="/faq" className="exp-util-link mobile-only">
              {t("navFaq")}
            </Link>
            <Link href="/contact" className="exp-util-link mobile-only">
              {t("navContact")}
            </Link>

            <label className="exp-util-static exp-locale-control" title={t("currency")}>
              <span className="exp-util-icon" aria-hidden>
                💱
              </span>
              <select
                aria-label={t("currency")}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as ShopCurrency)}
              >
                {currencies.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>

            <label className="exp-util-static exp-locale-control" title={t("language")}>
              <span className="exp-util-icon" aria-hidden>
                🌐
              </span>
              <select
                aria-label={t("language")}
                value={locale}
                onChange={(e) => setLocale(e.target.value as ShopLocale)}
              >
                {locales.map((code) => (
                  <option key={code} value={code}>
                    {SHOP_LOCALE_LABEL[code]}
                  </option>
                ))}
              </select>
            </label>

            {customer ? (
              <>
                <Link href="/account" className="exp-util-link">
                  {customer.name || customer.phone}
                </Link>
                <button type="button" className="exp-util-link exp-util-btn" onClick={logout}>
                  {t("navLogout")}
                </button>
              </>
            ) : (
              <Link href="/account/login" className="exp-signin exp-signin-dark">
                {t("navLogin")}
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className={wide ? "shop-main shop-main-wide exp-main" : "shop-main exp-main"}>
        {children}
      </main>

      <footer className="shop-footer exp-footer">
        <div className="shop-footer-grid">
          <div>
            <strong className="shop-footer-brand">{BRAND}</strong>
            <p>
              {isEn
                ? `Booking platform operated by ${operatingName}: flights, hotels, transfers, and activities.`
                : `منصة حجز تابعة لـ${operatingName}: طيران، فنادق، نقل، وأنشطة.`}
            </p>
            <p className="shop-footer-legal-meta">
              {COMPANY_LEGAL.addressAr}
              <br />
              {isEn ? "Tourism license" : "ترخيص سياحي رقم"} {COMPANY_LEGAL.tourismLicense}
            </p>
          </div>
          <div>
            <strong>{isEn ? "Explore" : "استكشف"}</strong>
            {platformEnabled() ? (
              <>
                <Link href="/destinations">{t("navDestinations")}</Link>
                <Link href="/deals">{t("navDeals")}</Link>
                <Link href="/trip-builder">{t("navTripBuilder")}</Link>
              </>
            ) : (
              <>
                <Link href="/#destinations">{t("navDestinations")}</Link>
                <Link href="/#offers">{isEn ? "Offers" : "العروض"}</Link>
              </>
            )}
            <Link href="/#search">{isEn ? "Search" : "البحث"}</Link>
            <Link href="/chat">{isEn ? "Assistant" : "المساعد الذكي"}</Link>
            <Link href="/bookings/manage">{isEn ? "Manage booking" : "إدارة حجزي"}</Link>
          </div>
          <div>
            <strong>{isEn ? "Legal" : "قانوني"}</strong>
            <Link href="/terms">{isEn ? "Terms" : "الشروط والأحكام"}</Link>
            <Link href="/privacy">{isEn ? "Privacy" : "سياسة الخصوصية"}</Link>
            <Link href="/booking-policy">{t("navPolicy")}</Link>
            <Link href="/payment-policy">{isEn ? "Payment policy" : "سياسة الدفع"}</Link>
            <Link href="/about">{t("navAbout")}</Link>
          </div>
          <div>
            <strong>{t("navContact")}</strong>
            <a href={`tel:${COMPANY_LEGAL.phoneE164}`}>{COMPANY_LEGAL.phoneDisplay}</a>
            <a href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp {COMPANY_LEGAL.phoneDisplay}
            </a>
            <a href={`mailto:${COMPANY_LEGAL.supportEmail}`}>{COMPANY_LEGAL.supportEmail}</a>
            <span>{COMPANY_LEGAL.hoursAr}</span>
          </div>
        </div>
        <p className="shop-footer-copy" suppressHydrationWarning>
          © {new Date().getFullYear()} {BRAND}.{" "}
          {isEn ? "All rights reserved." : "جميع الحقوق محفوظة."}
        </p>
      </footer>

      <ShopAssistant />
    </div>
  );
}

export function StoreFront(props: { children: ReactNode; wide?: boolean }) {
  return (
    <ShopI18nProvider>
      <StoreFrontInner {...props} />
    </ShopI18nProvider>
  );
}
