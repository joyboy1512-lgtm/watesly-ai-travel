"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  clearShopSession,
  getShopSession,
  type ShopCustomer,
} from "@/lib/shop-session";
import { WeekendGateLogo } from "@/components/shop/WeekendGateLogo";
import { COMPANY_LEGAL } from "@watesly-travel/shared";

const ShopAssistant = dynamic(
  () => import("@/components/shop/ShopAssistant").then((m) => m.ShopAssistant),
  { ssr: false },
);

const BRAND = "WeekendGate";

export function StoreFront({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setCustomer(getShopSession()?.customer || null);
    setMenuOpen(false);
  }, [pathname]);

  function logout() {
    clearShopSession();
    setCustomer(null);
    window.location.href = "/";
  }

  return (
    <div className="shop-root exp-theme">
      <header className="shop-header exp-header exp-header-white">
        <div className="shop-header-inner exp-header-inner">
          <Link href="/" className="shop-brand exp-brand" aria-label="WeekendGate">
            <WeekendGateLogo />
          </Link>

          <nav className="exp-header-links" aria-label="روابط رئيسية">
            <Link href="/about">من نحن</Link>
            <Link href="/booking-policy">سياسة الحجز</Link>
            <Link href="/faq">الأسئلة الشائعة</Link>
            <Link href="/contact">تواصل معنا</Link>
          </nav>

          <button
            type="button"
            className="shop-menu-toggle exp-menu-toggle exp-menu-toggle-dark"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            القائمة
          </button>

          <nav className={`exp-util-nav${menuOpen ? " open" : ""}`}>
            <Link href="/about" className="exp-util-link mobile-only">
              من نحن
            </Link>
            <Link href="/booking-policy" className="exp-util-link mobile-only">
              سياسة الحجز
            </Link>
            <Link href="/faq" className="exp-util-link mobile-only">
              الأسئلة الشائعة
            </Link>
            <Link href="/contact" className="exp-util-link mobile-only">
              تواصل معنا
            </Link>
            <span className="exp-util-static" title="العملة المتاحة حاليًا">
              <span className="exp-util-icon" aria-hidden>
                💱
              </span>
              KWD
            </span>
            <span className="exp-util-static" title="اللغة المتاحة حاليًا">
              <span className="exp-util-icon" aria-hidden>
                🌐
              </span>
              العربية
            </span>
            {customer ? (
              <>
                <Link href="/account" className="exp-util-link">
                  {customer.name || customer.phone}
                </Link>
                <button type="button" className="exp-util-link exp-util-btn" onClick={logout}>
                  خروج
                </button>
              </>
            ) : (
              <Link href="/account/login" className="exp-signin exp-signin-dark">
                دخول
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
              منصة حجز تابعة لـ{COMPANY_LEGAL.legalNameAr}: طيران، فنادق، نقل،
              وأنشطة.
            </p>
            <p className="shop-footer-legal-meta">{COMPANY_LEGAL.addressAr}</p>
          </div>
          <div>
            <strong>استكشف</strong>
            <Link href="/#destinations">الوجهات</Link>
            <Link href="/#offers">العروض</Link>
            <Link href="/#search">البحث</Link>
            <Link href="/chat">المساعد الذكي</Link>
            <Link href="/bookings/manage">إدارة حجزي</Link>
          </div>
          <div>
            <strong>قانوني</strong>
            <Link href="/terms">الشروط والأحكام</Link>
            <Link href="/privacy">سياسة الخصوصية</Link>
            <Link href="/booking-policy">التعديل والإلغاء</Link>
            <Link href="/payment-policy">سياسة الدفع</Link>
            <Link href="/about">من نحن</Link>
          </div>
          <div>
            <strong>تواصل</strong>
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

      <ShopAssistant />
    </div>
  );
}
