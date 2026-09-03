"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";
import type { ShopUiKey } from "@watesly-travel/shared";

const LINKS: Array<{ href: string; key: ShopUiKey }> = [
  { href: "/account", key: "navAccount" },
  { href: "/account/trips", key: "myTrips" },
  { href: "/account/points", key: "pointsNav" },
  { href: "/account/alerts", key: "priceAlertsNav" },
  { href: "/account/referrals", key: "referrals" },
  { href: "/account/notifications", key: "notifications" },
];

export function AccountSubnav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const { t } = useShopI18n();
  return (
    <>
      <nav className="wg-account-nav" aria-label={t("accountCustomer")}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : undefined}>
            {t(l.key)}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
