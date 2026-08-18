"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const LANG_KEY = "watesly_travel_lang";

type UiLang = "ar" | "en";

function getPreferredLang(): UiLang {
  if (typeof window === "undefined") return "ar";
  return localStorage.getItem(LANG_KEY) === "en" ? "en" : "ar";
}

function applyLang(lang: UiLang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  localStorage.setItem(LANG_KEY, lang);
}

function userInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
  }
  return (name || "؟").trim().slice(0, 2).toUpperCase();
}

const COPY = {
  ar: {
    notifications: "إشعارات",
    noNotes: "لا إشعارات",
    currency: "العملة",
    language: "اللغة",
    arabic: "العربية",
    english: "English",
    changeName: "تغيير الاسم",
    changePassword: "تغيير كلمة المرور",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    save: "حفظ",
    logout: "تسجيل الخروج",
    account: "الحساب",
    checking: "جارٍ التحقق من الجلسة...",
    nameSaved: "تم تحديث الاسم",
    passwordSaved: "تم تغيير كلمة المرور",
  },
  en: {
    notifications: "Notifications",
    noNotes: "No notifications",
    currency: "Currency",
    language: "Language",
    arabic: "العربية",
    english: "English",
    changeName: "Change name",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    save: "Save",
    logout: "Sign out",
    account: "Account",
    checking: "Checking session...",
    nameSaved: "Name updated",
    passwordSaved: "Password updated",
  },
};

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
  surface?: "light" | "dark";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotes, setShowNotes] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [currency, setCurrency] = useState(getPreferredCurrency);
  const [lang, setLang] = useState<UiLang>(getPreferredLang);
  const [editName, setEditName] = useState(false);
  const [editPass, setEditPass] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState("");
  const [accountErr, setAccountErr] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);

  const notesRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const t = COPY[lang];

  const visibleNav = useMemo(() => {
    const permissions = session?.permissions || [];
    return NAV.filter((item) => {
      const required = NAV_PERMISSIONS[item.href];
      if (!required) return true;
      return permissions.includes(required);
    });
  }, [session]);

  useEffect(() => {
    applyLang(getPreferredLang());
    setLang(getPreferredLang());
  }, []);

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
        setNameDraft(me.user.name);
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
    setShowUser(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const node = e.target as Node;
      if (showNotes && notesRef.current && !notesRef.current.contains(node)) {
        setShowNotes(false);
      }
      if (showUser && userRef.current && !userRef.current.contains(node)) {
        setShowUser(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showNotes, showUser]);

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

  function onLangChange(next: UiLang) {
    setLang(next);
    applyLang(next);
  }

  async function saveName() {
    if (!session) return;
    setAccountBusy(true);
    setAccountErr("");
    setAccountMsg("");
    try {
      const updated = await apiFetch<{ name: string }>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ name: nameDraft }),
      });
      const next = {
        ...session,
        user: { ...session.user, name: updated.name },
      };
      setSession(next);
      localStorage.setItem("watesly_travel_session", JSON.stringify(next));
      setEditName(false);
      setAccountMsg(t.nameSaved);
    } catch (err) {
      setAccountErr(err instanceof Error ? err.message : t.changeName);
    } finally {
      setAccountBusy(false);
    }
  }

  async function savePassword() {
    setAccountBusy(true);
    setAccountErr("");
    setAccountMsg("");
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setEditPass(false);
      setAccountMsg(t.passwordSaved);
    } catch (err) {
      setAccountErr(err instanceof Error ? err.message : t.changePassword);
    } finally {
      setAccountBusy(false);
    }
  }

  if (!ready || !session) {
    return (
      <main className="shell">
        <p className="lead">{t.checking}</p>
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
              <div className="meta-line">{session.organization.name}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="notif-wrap" ref={notesRef}>
              <button
                type="button"
                className="tb-notif-btn"
                onClick={() => {
                  setShowNotes((v) => !v);
                  setShowUser(false);
                }}
                aria-label={t.notifications}
              >
                <span className="tb-notif-label">{t.notifications}</span>
                {unread > 0 ? (
                  <span className="tb-notif-badge">{unread > 9 ? "9+" : unread}</span>
                ) : null}
              </button>
              {showNotes ? (
                <div className="notif-panel">
                  <div className="notif-panel-head">{t.notifications}</div>
                  {notifications.length === 0 ? (
                    <p className="hint">{t.noNotes}</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`notif-item${!n.readAt ? " unread" : ""}`}
                        onClick={() => {
                          void markRead(n.id);
                          if (n.linkRef?.includes("/conversations")) {
                            const id = n.linkRef.includes("id=")
                              ? n.linkRef.split("id=").pop()
                              : n.linkRef.split("/").pop();
                            if (id)
                              router.push(`/dashboard/conversations?id=${id}`);
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

            <div className="user-menu" ref={userRef}>
              <button
                type="button"
                className="tb-user-btn"
                onClick={() => {
                  setShowUser((v) => !v);
                  setShowNotes(false);
                  setAccountErr("");
                  setAccountMsg("");
                }}
                aria-label={t.account}
              >
                <span className="tb-avatar">{userInitials(session.user.name)}</span>
                <span className="tb-user-name">{session.user.name}</span>
              </button>
              {showUser ? (
                <div className="user-panel">
                  <div className="user-panel-head">
                    <span className="tb-avatar lg">
                      {userInitials(session.user.name)}
                    </span>
                    <div>
                      <strong>{session.user.name}</strong>
                      <span>{session.user.email}</span>
                    </div>
                  </div>

                  <label className="user-field">
                    <span>{t.currency}</span>
                    <select
                      value={currency}
                      onChange={(e) => void onCurrencyChange(e.target.value)}
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} · {c.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="user-field">
                    <span>{t.language}</span>
                    <select
                      value={lang}
                      onChange={(e) => onLangChange(e.target.value as UiLang)}
                    >
                      <option value="ar">{t.arabic}</option>
                      <option value="en">{t.english}</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="user-link"
                    onClick={() => {
                      setEditName((v) => !v);
                      setEditPass(false);
                    }}
                  >
                    {t.changeName}
                  </button>
                  {editName ? (
                    <div className="user-edit">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                      />
                      <button
                        type="button"
                        className="wi-btn primary"
                        disabled={accountBusy || nameDraft.trim().length < 2}
                        onClick={() => void saveName()}
                      >
                        {t.save}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="user-link"
                    onClick={() => {
                      setEditPass((v) => !v);
                      setEditName(false);
                    }}
                  >
                    {t.changePassword}
                  </button>
                  {editPass ? (
                    <div className="user-edit">
                      <input
                        type="password"
                        placeholder={t.currentPassword}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <input
                        type="password"
                        placeholder={t.newPassword}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="wi-btn primary"
                        disabled={
                          accountBusy ||
                          currentPassword.length < 1 ||
                          newPassword.length < 8
                        }
                        onClick={() => void savePassword()}
                      >
                        {t.save}
                      </button>
                    </div>
                  ) : null}

                  {accountMsg ? <p className="user-ok">{accountMsg}</p> : null}
                  {accountErr ? <p className="user-err">{accountErr}</p> : null}

                  <button type="button" className="user-logout" onClick={logout}>
                    {t.logout}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
