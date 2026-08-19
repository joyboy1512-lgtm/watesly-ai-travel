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

  const heroOverlay = pathname === "/";

  return (
    <div className={`shop-root${heroOverlay ? " shop-home" : ""}`}>
      <header className={`shop-header${heroOverlay ? " shop-header-hero" : ""}`}>
        <div className="shop-header-inner">
          <Link href="/" className="shop-brand">
            <span className="shop-mark" aria-hidden>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 2C8 6 4 8 4 13a8 8 0 1 0 16 0c0-5-4-7-8-11zm0 18a6 6 0 0 1-6-6c0-3.5 2.8-5.2 6-8.6 3.2 3.4 6 5.1 6 8.6a6 6 0 0 1-6 6z" />
              </svg>
            </span>
            <span>
              <strong>{BRAND}</strong>
              <small>سفر بلمسة بحرية</small>
            </span>
          </Link>

          <button
            type="button"
            className="shop-menu-toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            القائمة
          </button>

          <nav className={`shop-nav${menuOpen ? " open" : ""}`}>
            <Link href="/#search">احجز الآن</Link>
            <Link href="/#destinations">الوجهات</Link>
            <Link href="/#offers">العروض</Link>
            <Link href="/#reviews">التقييمات</Link>
            <Link href="/account">رحلاتي</Link>
            <Link href="/chat">المساعد</Link>
            {customer ? (
              <>
                <Link href="/account" className="shop-user">
                  {customer.name || customer.phone}
                </Link>
                <button type="button" className="shop-linkbtn" onClick={logout}>
                  خروج
                </button>
              </>
            ) : (
              <Link href="/account/login" className="shop-cta">
                دخول
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className={wide ? "shop-main shop-main-wide" : "shop-main"}>
        {children}
      </main>

      <footer className="shop-footer">
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
