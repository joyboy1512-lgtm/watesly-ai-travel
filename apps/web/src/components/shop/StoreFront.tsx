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
  type ShopCurrency,
  type ShopLocale,
} from "@watesly-travel/shared";
import { platformEnabled } from "@/lib/platform-flags";
import { newUiEnabled } from "@/lib/new-ui-flags";
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
  const { t, locale, currency, setLocale, setCurrency, currencies } = useShopI18n();
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [bootstrap, setBootstrap] = useState<ShopBootstrap | null>(null);

  useEffect(() => {
    setCustomer(getShopSession()?.customer || null);
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".wg-header-user-dropdown")) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [userMenuOpen]);

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

  const isHome = pathname === "/";
  const newUi = newUiEnabled();

  function navActive(prefix: string) {
    if (prefix === "/") return pathname === "/";
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  return (
    <div
      className={`shop-root exp-theme${newUi ? " wg-new-ui" : ""}${isHome ? " shop-home-layout" : ""}`}
      lang={locale === "en" ? "en" : "ar"}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <header
        className={`shop-header exp-header${isHome ? " exp-header-hero-overlay" : " exp-header-white"}`}
      >
        {newUi ? (
          <div className="shop-header-inner exp-header-inner wg-header-cap-wrap">
            <Link
              href="/"
              className="wg-header-logo-standalone"
              aria-label="WeekendGate"
            >
              <WeekendGateLogo light={isHome} />
            </Link>

            <div className="wg-header-cap">
              <nav className="wg-header-cap-nav" aria-label="روابط سريعة">
                <Link href="/about">{t("navAbout")}</Link>
                <Link href="/contact">{t("navContact")}</Link>
                <button
                  type="button"
                  className="wg-header-cap-dir"
                  title="اتجاه النص"
                  aria-label="تبديل اتجاه النص"
                  onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                >
                  {locale === "ar" ? "RTL" : "LTR"}
                </button>
              </nav>

              <div className="wg-header-cap-user">
                <button
                  type="button"
                  className="wg-header-cap-menu-btn"
                  aria-expanded={menuOpen}
                  aria-label={t("navMenu")}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  ☰
                </button>

                {customer ? (
                  <div className="wg-header-user-dropdown">
                    <button
                      type="button"
                      className="wg-header-user-trigger"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="menu"
                      onClick={(event) => {
                        event.stopPropagation();
                        setUserMenuOpen((v) => !v);
                      }}
                    >
                      <span className="wg-header-user-name">
                        {customer.name || customer.phone}
                      </span>
                      <span className="wg-header-user-chevron" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {userMenuOpen ? (
                      <div className="wg-header-user-menu" role="menu">
                        <Link href="/account" role="menuitem">
                          بياناتي
                        </Link>
                        <Link href="/bookings/manage" role="menuitem">
                          حجوزاتي
                        </Link>
                        <label className="wg-header-menu-currency" role="none">
                          <span>العملة</span>
                          <select
                            aria-label="العملة"
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
                        <button type="button" role="menuitem" onClick={logout}>
                          خروج
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link href="/account/login" className="wg-header-cap-signin">
                    {t("navLogin")}
                  </Link>
                )}
              </div>
            </div>

            <div className={`wg-header-cap-mobile${menuOpen ? " open" : ""}`}>
              <Link href="/about">{t("navAbout")}</Link>
              <Link href="/contact">{t("navContact")}</Link>
              <button
                type="button"
                className="wg-header-cap-mobile-dir"
                onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              >
                {locale === "ar" ? "RTL" : "LTR"}
              </button>
              {customer ? (
                <>
                  <Link href="/account">بياناتي</Link>
                  <Link href="/bookings/manage">حجوزاتي</Link>
                  <label className="wg-header-menu-currency">
                    <span>العملة</span>
                    <select
                      aria-label="العملة"
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
                  <button type="button" onClick={logout}>
                    خروج
                  </button>
                </>
              ) : (
                <Link href="/account/login">{t("navLogin")}</Link>
              )}
              {platformEnabled() ? (
                <>
                  <Link href="/deals">{t("navDeals")}</Link>
                  <Link href="/destinations">{t("navDestinations")}</Link>
                  <Link href="/trip-builder">{t("navTripBuilder")}</Link>
                </>
              ) : null}
              <Link href="/booking-policy">{t("navPolicy")}</Link>
              <Link href="/faq">{t("navFaq")}</Link>
            </div>
          </div>
        ) : (
          <div className="shop-header-inner exp-header-inner wg-header-row">
            <Link href="/" className="shop-brand exp-brand wg-header-brand" aria-label="WeekendGate">
              <WeekendGateLogo light={isHome} />
            </Link>

            <nav className="wg-header-pill-nav" aria-label="روابط سريعة">
              <Link href="/about">{t("navAbout")}</Link>
              <Link href="/contact">{t("navContact")}</Link>
            </nav>

            <div className="wg-header-end">
              <button
                type="button"
                className={`shop-menu-toggle exp-menu-toggle${isHome ? "" : " exp-menu-toggle-dark"}`}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                {t("navMenu")}
              </button>

              <div className={`wg-header-actions${menuOpen ? " open" : ""}`}>
                <a
                  href={`tel:${COMPANY_LEGAL.phoneE164}`}
                  className="wg-header-chip wg-header-phone"
                  title="اتصل بنا"
                >
                  <span className="wg-header-chip-ico" aria-hidden>
                    📞
                  </span>
                  <span className="wg-header-chip-text">{COMPANY_LEGAL.phoneDisplay}</span>
                </a>

                <label className="wg-header-chip" title="العملة">
                  <span className="wg-header-chip-ico" aria-hidden>
                    💱
                  </span>
                  <select
                    aria-label="العملة"
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

                <button
                  type="button"
                  className="wg-header-chip wg-header-dir"
                  title="اتجاه النص"
                  aria-label="تبديل اتجاه النص"
                  onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
                >
                  <span className="wg-header-chip-ico" aria-hidden>
                    ⇄
                  </span>
                  <span className="wg-header-chip-text">{locale === "ar" ? "RTL" : "LTR"}</span>
                </button>

                {customer ? (
                  <div className="wg-header-account">
                    <Link href="/account" className="wg-header-user">
                      {customer.name || customer.phone}
                    </Link>
                    <button type="button" className="wg-header-logout" onClick={logout}>
                      خروج
                    </button>
                  </div>
                ) : (
                  <Link href="/account/login" className="wg-header-signin">
                    {t("navLogin")}
                  </Link>
                )}

                <div className="wg-header-mobile-links mobile-only">
                  <Link href="/about">{t("navAbout")}</Link>
                  <Link href="/contact">{t("navContact")}</Link>
                  {platformEnabled() ? (
                    <>
                      <Link href="/deals">{t("navDeals")}</Link>
                      <Link href="/destinations">{t("navDestinations")}</Link>
                      <Link href="/trip-builder">{t("navTripBuilder")}</Link>
                    </>
                  ) : null}
                  <Link href="/booking-policy">{t("navPolicy")}</Link>
                  <Link href="/faq">{t("navFaq")}</Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className={wide ? "shop-main shop-main-wide exp-main" : "shop-main exp-main"}>
        {children}
      </main>

      <footer className="shop-footer exp-footer">
        <div className="shop-footer-grid">
          <div>
            <strong className="shop-footer-brand">{BRAND}</strong>
            <p>
              منصة حجز تابعة لـ{COMPANY_LEGAL.legalNameAr}: طيران، فنادق، نقل، وأنشطة.
            </p>
            <p className="shop-footer-legal-meta">
              {COMPANY_LEGAL.addressAr}
              <br />
              ترخيص سياحي رقم {COMPANY_LEGAL.tourismLicense}
            </p>
          </div>
          <div>
            <strong>استكشف</strong>
            {platformEnabled() ? (
              <>
                <Link href="/destinations">{t("navDestinations")}</Link>
                <Link href="/deals">{t("navDeals")}</Link>
                <Link href="/trip-builder">{t("navTripBuilder")}</Link>
              </>
            ) : (
              <>
                <Link href="/#destinations">{t("navDestinations")}</Link>
                <Link href="/#offers">العروض</Link>
              </>
            )}
            <Link href="/#search">البحث</Link>
            <Link href="/chat">المساعد الذكي</Link>
            <Link href="/bookings/manage">إدارة حجزي</Link>
            <Link href="/faq">{t("navFaq")}</Link>
          </div>
          <div>
            <strong>قانوني</strong>
            <Link href="/terms">الشروط والأحكام</Link>
            <Link href="/privacy">سياسة الخصوصية</Link>
            <Link href="/booking-policy">{t("navPolicy")}</Link>
            <Link href="/payment-policy">سياسة الدفع</Link>
            <Link href="/about">{t("navAbout")}</Link>
          </div>
          <div>
            <strong>{t("navContact")}</strong>
            <a href={`tel:${COMPANY_LEGAL.phoneE164}`}>{COMPANY_LEGAL.phoneDisplay}</a>
            <a href={COMPANY_LEGAL.whatsappUrl} target="_blank" rel="noreferrer">
              واتساب {COMPANY_LEGAL.phoneDisplay}
            </a>
            <a href={`mailto:${COMPANY_LEGAL.supportEmail}`}>{COMPANY_LEGAL.supportEmail}</a>
            <span>{COMPANY_LEGAL.hoursAr}</span>
          </div>
        </div>
        <p className="shop-footer-copy" suppressHydrationWarning>
          © {new Date().getFullYear()} {BRAND}. جميع الحقوق محفوظة.
        </p>
      </footer>

      {newUi ? (
        <nav className="wg-bottom-nav" aria-label="التنقل الرئيسي">
          <Link href="/" className={pathname === "/" ? "active" : ""}>
            <span className="wg-nav-ico">🏠</span>
            الرئيسية
          </Link>
          <Link href="/flights/results" className={navActive("/flights") ? "active" : ""}>
            <span className="wg-nav-ico">✈</span>
            طيران
          </Link>
          <Link href="/hotels/results" className={navActive("/hotels") ? "active" : ""}>
            <span className="wg-nav-ico">🏨</span>
            فنادق
          </Link>
          {platformEnabled() ? (
            <Link href="/deals" className={navActive("/deals") ? "active" : ""}>
              <span className="wg-nav-ico">🔥</span>
              عروض
            </Link>
          ) : (
            <Link href="/#search" className="">
              <span className="wg-nav-ico">🔍</span>
              بحث
            </Link>
          )}
          {customer ? (
            <Link href="/account" className={navActive("/account") ? "active" : ""}>
              <span className="wg-nav-ico">👤</span>
              حسابي
            </Link>
          ) : (
            <Link
              href="/account/login"
              className={pathname === "/account/login" ? "active" : ""}
            >
              <span className="wg-nav-ico">👤</span>
              {t("navLogin")}
            </Link>
          )}
        </nav>
      ) : null}

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
