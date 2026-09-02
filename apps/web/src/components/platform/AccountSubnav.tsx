"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LINKS = [
  { href: "/account", label: "حسابي" },
  { href: "/account/trips", label: "رحلاتي" },
  { href: "/account/points", label: "النقاط" },
  { href: "/account/alerts", label: "تنبيهات السعر" },
  { href: "/account/referrals", label: "الإحالات" },
  { href: "/account/notifications", label: "الإشعارات" },
];

export function AccountSubnav({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="wg-account-nav" aria-label="حساب العميل">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? "on" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}
