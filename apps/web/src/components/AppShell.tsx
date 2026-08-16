"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  APP_NAME,
  NAV_PERMISSIONS,
  SUPPORTED_CURRENCIES,
} from "@watesly-travel/shared";
import { apiFetch, clearSession, getSession, type AuthSession } from "@/lib/api";
import {
  getPreferredCurrency,
  setPreferredCurrency,
} from "@/lib/currency";

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function isNavActive(href: string, pathname: string) {
  const path = normalizePath(pathname);
  if (href === "/dashboard") return path === "/dashboard";
  return path === href || path.startsWith(`${href}/`);
}

const NAV = [
  { href: "/dashboard", label: "لوحة التحكم" },
  { href: "/dashboard/inquiries", label: "الاستعلامات المباشرة" },
  { href: "/dashboard/conversations", label: "المحادثات" },
  { href: "/dashboard/contacts", label: "العملاء" },
  { href: "/dashboard/quotes", label: "عروض الأسعار" },
  { href: "/dashboard/bookings", label: "الحجوزات" },
  { href: "/dashboard/providers", label: "مزودو السفر" },
  { href: "/dashboard/pricing", label: "قواعد التسعير" },
  { href: "/dashboard/whatsapp", label: "واتساب" },
  { href: "/dashboard/channels", label: "القنوات" },
  { href: "/dashboard/templates", label: "القوالب" },
  { href: "/dashboard/campaigns", label: "الحملات" },
  { href: "/dashboard/users", label: "الموظفون والصلاحيات" },
  { href: "/dashboard/audit", label: "سجل التدقيق" },
  { href: "/dashboard/settings", label: "الإعدادات" },
];

type Notification = {
  id: string;
  title: string;
  body?: string | null;
  readAt?: string | null;
  createdAt: string;
  linkRef?: string | null;
};

export function AppShell({
  title,
  children,
  dense = false,
  surface = "light",
}: {
  title: string;
  children: ReactNode;
  dense?: boolean;
  /** light = customers-like light content surface; dark = classic dashboard home */
  surface?: "light" | "dark";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [currency, setCurrency] = useState(getPreferredCurrency);

  const visibleNav = useMemo(() => {
    const permissions = session?.permissions || [];
    return NAV.filter((item) => {
      const required = NAV_PERMISSIONS[item.href];
      if (!required) return true;
      return permissions.includes(required);
    });
  }, [session]);

  useEffect(() => {
    const local = getSession();
    if (!local?.accessToken) {
      router.replace("/login");
      return;
    }

    apiFetch<{
      user: AuthSession["user"];
      organization: AuthSession["organization"] & {
        slug?: string;
        defaultCurrency?: string;
        timezone?: string;
      };
      role: { code: string; name?: string };
      permissions: string[];
    }>("/auth/me")
      .then((me) => {
        const next: AuthSession = {
          accessToken: local.accessToken,
          user: me.user,
          organization: {
            id: me.organization.id,
            name: me.organization.name,
          },
          role: { code: me.role.code },
          permissions: me.permissions,
        };
        localStorage.setItem("watesly_travel_session", JSON.stringify(next));
        setSession(next);
        const stored = localStorage.getItem("watesly_travel_currency");
        if (!stored && me.organization.defaultCurrency) {
          setPreferredCurrency(me.organization.defaultCurrency);
          setCurrency(me.organization.defaultCurrency);
        } else {
          setCurrency(getPreferredCurrency());
        }
        setReady(true);
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    apiFetch<Notification[]>("/notifications")
      .then(setNotifications)
      .catch(() => undefined);
  }, [ready, pathname]);

  useEffect(() => {
    setNavOpen(false);
    setShowNotes(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  async function markRead(id: string) {
    await apiFetch(`/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
  }

  async function onCurrencyChange(next: string) {
    setCurrency(next);
    setPreferredCurrency(next);
    try {
      await apiFetch("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({ defaultCurrency: next }),
      });
    } catch {
      // Keep local preference even if org update is not permitted.
    }
  }

  if (!ready || !session) {
    return (
      <main className="shell">
        <p className="lead">جارٍ التحقق من الجلسة...</p>
      </main>
    );
  }

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <div
      className={`app-shell${dense ? " dense" : ""}${navOpen ? " nav-open" : ""}`}
    >
      <button
        type="button"
        className="nav-backdrop"
        aria-label="إغلاق القائمة"
        onClick={() => setNavOpen(false)}
      />

      <aside className="sidebar" id="app-sidebar">
        <div className="sidebar-head">
          <p className="brand">{APP_NAME}</p>
          <button
            type="button"
            className="nav-close"
            aria-label="إغلاق القائمة"
            onClick={() => setNavOpen(false)}
          >
            ✕
          </button>
        </div>
        <nav className="nav">
          {visibleNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isNavActive(item.href, pathname) ? "active" : undefined}
              onClick={() => setNavOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <section
        className={`main${dense ? " main-dense" : ""}${surface === "light" ? " main-light" : ""}`}
      >
        <header className={`topbar${dense ? " topbar-dense" : ""}`}>
          <div className="topbar-title-block">
            <button
              type="button"
              className="nav-toggle"
              aria-label="فتح القائمة"
              aria-expanded={navOpen}
              aria-controls="app-sidebar"
              onClick={() => setNavOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <h2>{title}</h2>
              <div className="meta-line">
                {session.organization.name} · {session.user.name} ·{" "}
                {session.role.code}
              </div>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="currency-switcher">
              <span>العملة</span>
              <select
                value={currency}
                onChange={(e) => void onCurrencyChange(e.target.value)}
                aria-label="تغيير العملة"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} · {c.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="notif-wrap">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowNotes((v) => !v)}
              >
                الإشعارات{unread ? ` (${unread})` : ""}
              </button>
              {showNotes ? (
                <div className="notif-panel">
                  {notifications.length === 0 ? (
                    <p className="hint">لا إشعارات</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`notif-item${!n.readAt ? " unread" : ""}`}
                        onClick={() => {
                          void markRead(n.id);
                          if (n.linkRef?.includes("/conversations/")) {
                            const id = n.linkRef.split("/").pop();
                            if (id)
                              router.push(
                                `/dashboard/conversations?id=${id}`,
                              );
                          } else if (n.linkRef) {
                            router.push(n.linkRef);
                          }
                          setShowNotes(false);
                        }}
                      >
                        <strong>{n.title}</strong>
                        <span>{n.body}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <button type="button" className="btn secondary" onClick={logout}>
              تسجيل الخروج
            </button>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
