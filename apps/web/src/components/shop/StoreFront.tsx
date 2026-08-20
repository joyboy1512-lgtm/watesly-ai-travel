"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import {
  clearShopSession,
  getShopSession,
  type ShopCustomer,
} from "@/lib/shop-session";
import { ShopAssistant } from "@/components/shop/ShopAssistant";
import { WeekendGateLogo } from "@/components/shop/WeekendGateLogo";

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
          <Link href="/" className="shop-brand exp-brand">
            <WeekendGateLogo />
          </Link>

          <button
            type="button"
            className="shop-menu-toggle exp-menu-toggle exp-menu-toggle-dark"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            القائمة
          </button>

          <nav className={`exp-util-nav${menuOpen ? " open" : ""}`}>
            <label className="exp-util-item">
              <span className="exp-util-icon" aria-hidden>💱</span>
              <select defaultValue="KWD" aria-label="العملة">
                <option value="KWD">KWD</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </label>
            <label className="exp-util-item">
              <span className="exp-util-icon" aria-hidden>🌐</span>
              <select defaultValue="ar" aria-label="اللغة">
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </label>
            <Link href="/chat" className="exp-util-link">
              اتصل بنا
            </Link>
            <Link href="/chat" className="exp-util-link">
              الدعم
            </Link>
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
              منصة سفر كاملة: طيران، فنادق، نقل، وأنشطة — بأسعار حية وخدمة
              شخصية من فريق الحجوزات.
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
            <strong>حسابك</strong>
            <Link href="/account/login">تسجيل الدخول</Link>
            <Link href="/account">رحلاتي</Link>
            <Link href="/book">إتمام طلب</Link>
          </div>
          <div>
            <strong>تواصل</strong>
            <span>الكويت · GMT+3</span>
            <span>دعم 24/7 عبر المساعد</span>
            <span>حجز آمن · بدون دفع فوري</span>
          </div>
        </div>
        <p className="shop-footer-copy">
          © {new Date().getFullYear()} {BRAND}. جميع الحقوق محفوظة.
        </p>
      </footer>

      <ShopAssistant />
    </div>
  );
}
