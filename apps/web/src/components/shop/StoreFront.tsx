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

  return (
    <div className="shop-root exp-theme">
      <div className="exp-loyalty-stripe" aria-hidden>
        <span>عروض حصرية · أسعار حية · دعم 24/7</span>
      </div>

      <header className="shop-header exp-header">
        <div className="shop-header-inner exp-header-inner">
          <Link href="/" className="shop-brand exp-brand">
            <span className="exp-wordmark">{BRAND}</span>
          </Link>

          <button
            type="button"
            className="shop-menu-toggle exp-menu-toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            القائمة
          </button>

          <nav className={`shop-nav exp-nav${menuOpen ? " open" : ""}`}>
            <Link href="/account">رحلاتي</Link>
            <Link href="/chat">المساعد</Link>
            <Link href="/#destinations">الوجهات</Link>
            {customer ? (
              <>
                <Link href="/account" className="exp-user">
                  {customer.name || customer.phone}
                </Link>
                <button type="button" className="shop-linkbtn exp-linkbtn" onClick={logout}>
                  خروج
                </button>
              </>
            ) : (
              <Link href="/account/login" className="exp-signin">
                تسجيل الدخول
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
