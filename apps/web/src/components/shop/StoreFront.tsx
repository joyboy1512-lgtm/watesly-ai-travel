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

export function StoreFront({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [customer, setCustomer] = useState<ShopCustomer | null>(null);

  useEffect(() => {
    setCustomer(getShopSession()?.customer || null);
  }, [pathname]);

  function logout() {
    clearShopSession();
    setCustomer(null);
    window.location.href = "/";
  }

  return (
    <div className="shop-root">
      <header className="shop-header">
        <Link href="/" className="shop-brand">
          <span className="shop-mark">WG</span>
          <strong>{BRAND}</strong>
        </Link>
        <nav className="shop-nav">
          <Link href="/#search" className={pathname === "/" ? "on" : undefined}>
            احجز
          </Link>
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
      </header>
      <main className="shop-main">{children}</main>
      <footer className="shop-footer">
        <p>
          {BRAND} · حجوزات طيران وفنادق ونقل وأنشطة · الطلب يُحفظ لفريق الحجوزات
          لإتمام التأكيد
        </p>
      </footer>
      <ShopAssistant />
    </div>
  );
}
