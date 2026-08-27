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
            <label className="exp-util-item">
              <span className="exp-util-icon" aria-hidden>
                💱
              </span>
              <select defaultValue="KWD" aria-label="العملة">
                <option value="KWD">KWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="exp-util-item">
              <span className="exp-util-icon" aria-hidden>
                🌐
              </span>
              <select defaultValue="ar" aria-label="اللغة">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
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
              منصة سفر كويتية: طيران، فنادق، نقل، وأنشطة. أثناء الاختبار تظهر
              نتائج تجريبية بوضوح حتى اكتمال ربط المزوّدين.
            </p>
            <p className="shop-footer-legal-meta">
              WeekendGate Travel · ترخيص تجاري: 123456 · CR: KW-2024-001
            </p>
          </div>
          <div>
            <strong>استكشف</strong>
            <Link href="/#destinations">الوجهات</Link>
            <Link href="/#offers">العروض</Link>
            <Link href="/#search">البحث</Link>
            <Link href="/chat">المساعد الذكي</Link>
          </div>
          <div>
            <strong>قانوني</strong>
            <Link href="/terms">الشروط والأحكام</Link>
            <Link href="/privacy">سياسة الخصوصية</Link>
            <Link href="/booking-policy">التعديل والإلغاء</Link>
            <Link href="/about">من نحن</Link>
          </div>
          <div>
            <strong>تواصل</strong>
            <span>+965 2222 0000</span>
            <span>support@weekendgate.com</span>
            <span>الكويت · GMT+3</span>
            <span className="shop-footer-payments">K-Net · Visa · Mastercard</span>
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
