"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashLang = "ar" | "en";

export const DASH_LANG_KEY = "watesly_travel_lang";
export const SHOP_LOCALE_KEY = "weekendgate_locale";
export const DASH_LANG_EVENT = "watesly-lang-change";

const COPY = {
  nav: {
    "/dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
    "/dashboard/inquiries": { ar: "الاستعلامات المباشرة", en: "Live inquiries" },
    "/dashboard/conversations": { ar: "المحادثات", en: "Conversations" },
    "/dashboard/assistant": { ar: "مساعد السفر", en: "Travel assistant" },
    "/dashboard/contacts": { ar: "العملاء", en: "Customers" },
    "/dashboard/quotes": { ar: "عروض الأسعار", en: "Quotes" },
    "/dashboard/bookings": { ar: "الحجوزات", en: "Bookings" },
    "/dashboard/providers": { ar: "مزودو السفر", en: "Travel providers" },
    "/dashboard/currency": { ar: "العملة وسعر الصرف", en: "Currency & FX" },
    "/dashboard/pricing": { ar: "قواعد التسعير", en: "Pricing rules" },
    "/dashboard/whatsapp": { ar: "واتساب", en: "WhatsApp" },
    "/dashboard/channels": { ar: "القنوات", en: "Channels" },
    "/dashboard/templates": { ar: "القوالب", en: "Templates" },
    "/dashboard/campaigns": { ar: "الحملات", en: "Campaigns" },
    "/dashboard/catalog": { ar: "كتالوج ميتا", en: "Meta catalog" },
    "/dashboard/users": { ar: "الموظفون والصلاحيات", en: "Staff & roles" },
    "/dashboard/audit": { ar: "سجل التدقيق", en: "Audit log" },
    "/dashboard/cms": { ar: "CMS · المحتوى", en: "CMS · Content" },
    "/dashboard/settings": { ar: "الإعدادات", en: "Settings" },
  },
  title: {
    "لوحة التحكم": { ar: "لوحة التحكم", en: "Dashboard" },
    "الاستعلامات المباشرة": { ar: "الاستعلامات المباشرة", en: "Live inquiries" },
    "المحادثات": { ar: "المحادثات", en: "Conversations" },
    "مساعد السفر": { ar: "مساعد السفر", en: "Travel assistant" },
    "العملاء": { ar: "العملاء", en: "Customers" },
    "عروض الأسعار": { ar: "عروض الأسعار", en: "Quotes" },
    "الحجوزات": { ar: "الحجوزات", en: "Bookings" },
    "مزودو السفر": { ar: "مزودو السفر", en: "Travel providers" },
    "العملة وسعر الصرف": { ar: "العملة وسعر الصرف", en: "Currency & FX" },
    "قواعد التسعير": { ar: "قواعد التسعير", en: "Pricing rules" },
    "واتساب": { ar: "واتساب", en: "WhatsApp" },
    "القنوات": { ar: "القنوات", en: "Channels" },
    "القوالب": { ar: "القوالب", en: "Templates" },
    "الحملات": { ar: "الحملات", en: "Campaigns" },
    "كتالوج ميتا": { ar: "كتالوج ميتا", en: "Meta catalog" },
    "كتالوج ميتا · واتساب": { ar: "كتالوج ميتا · واتساب", en: "Meta catalog · WhatsApp" },
    "الموظفون والصلاحيات": { ar: "الموظفون والصلاحيات", en: "Staff & roles" },
    "سجل التدقيق": { ar: "سجل التدقيق", en: "Audit log" },
    "CMS · المحتوى": { ar: "CMS · المحتوى", en: "CMS · Content" },
    "الإعدادات": { ar: "الإعدادات", en: "Settings" },
    "إتمام الحجز": { ar: "إتمام الحجز", en: "Complete booking" },
    "إتمام حجز الفندق": { ar: "إتمام حجز الفندق", en: "Complete hotel booking" },
    "إتمام حجز النقل": { ar: "إتمام حجز النقل", en: "Complete transfer booking" },
    "حجز نشاط": { ar: "حجز نشاط", en: "Book activity" },
    "تفاصيل الحجز": { ar: "تفاصيل الحجز", en: "Booking details" },
  },
  status: {
    quoted: { ar: "مُسعَّر", en: "Quoted" },
    draft: { ar: "مسودة", en: "Draft" },
    sent: { ar: "مُرسل", en: "Sent" },
    accepted: { ar: "مقبول", en: "Accepted" },
    expired: { ar: "منتهي", en: "Expired" },
    booked: { ar: "محجوز", en: "Booked" },
    open: { ar: "مفتوحة", en: "Open" },
    pending: { ar: "بانتظار الرد", en: "Waiting" },
    closed: { ar: "مغلقة", en: "Closed" },
    on_hold: { ar: "معلّق", en: "On hold" },
    issued: { ar: "مُصدَر", en: "Issued" },
    completed: { ar: "مكتمل", en: "Completed" },
    cancelled: { ar: "ملغى", en: "Cancelled" },
  },
  source: {
    direct: { ar: "مباشر", en: "Direct" },
    web_shop: { ar: "المتجر", en: "Shop" },
    whatsapp: { ar: "واتساب", en: "WhatsApp" },
    telegram: { ar: "تلجرام", en: "Telegram" },
    quote: { ar: "عرض سعر", en: "Quote" },
  },
  service: {
    flight: { ar: "طيران", en: "Flight" },
    hotel: { ar: "فندق", en: "Hotel" },
    transfer: { ar: "مواصلات", en: "Transfer" },
    activity: { ar: "أنشطة", en: "Activity" },
    all: { ar: "الكل", en: "All" },
  },
  common: {
    search: { ar: "بحث", en: "Search" },
    save: { ar: "حفظ", en: "Save" },
    delete: { ar: "حذف", en: "Delete" },
    edit: { ar: "تعديل", en: "Edit" },
    archive: { ar: "أرشفة", en: "Archive" },
    send: { ar: "إرسال", en: "Send" },
    book: { ar: "حجز", en: "Book" },
    cancel: { ar: "إلغاء", en: "Cancel" },
    apply: { ar: "تطبيق الفلاتر", en: "Apply filters" },
    reset: { ar: "مسح الفلاتر", en: "Clear filters" },
    status: { ar: "الحالة", en: "Status" },
    customer: { ar: "العميل", en: "Customer" },
    route: { ar: "المسار", en: "Route" },
    date: { ar: "التاريخ", en: "Date" },
    source: { ar: "المصدر", en: "Source" },
    created: { ar: "أُنشئ", en: "Created" },
    actions: { ar: "إجراء", en: "Actions" },
    language: { ar: "اللغة", en: "Language" },
    publicSite: { ar: "الموقع العام", en: "Public site" },
    openMenu: { ar: "فتح القائمة", en: "Open menu" },
    closeMenu: { ar: "إغلاق القائمة", en: "Close menu" },
    pickDate: { ar: "اختر التاريخ", en: "Choose date" },
    noData: { ar: "بدون بيانات", en: "No details" },
    saveCustomer: { ar: "حفظ العميل", en: "Save customer" },
  },
} as const;

type CopyLeaf = { ar: string; en: string };

export function readDashLang(): DashLang {
  if (typeof window === "undefined") return "ar";
  try {
    const stored =
      localStorage.getItem(DASH_LANG_KEY) ||
      localStorage.getItem(SHOP_LOCALE_KEY);
    return stored === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

export function dashDir(lang: DashLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function applyDashLang(lang: DashLang) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dashDir(lang);
  try {
    localStorage.setItem(DASH_LANG_KEY, lang);
    localStorage.setItem(SHOP_LOCALE_KEY, lang);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(DASH_LANG_EVENT, { detail: lang }));
}

export function dashText(
  table: Record<string, CopyLeaf> | undefined,
  key: string,
  lang: DashLang,
) {
  const row = table?.[key];
  if (!row) return key;
  return row[lang] || row.ar || key;
}

export function dashTitle(title: string, lang: DashLang) {
  return dashText(COPY.title, title, lang);
}

export function dashNavLabel(href: string, lang: DashLang) {
  return dashText(COPY.nav, href, lang);
}

export function dashStatus(value: string, lang: DashLang) {
  return dashText(COPY.status, value, lang);
}

export function dashSource(value: string, lang: DashLang) {
  return dashText(COPY.source, value, lang);
}

export function dashService(value: string, lang: DashLang) {
  return dashText(COPY.service, value, lang);
}

export function dashCommon(key: keyof typeof COPY.common, lang: DashLang) {
  return COPY.common[key][lang];
}

export function dashLocaleTag(lang: DashLang) {
  return lang === "en" ? "en-GB" : "ar-KW";
}

type DashI18nValue = {
  lang: DashLang;
  dir: "rtl" | "ltr";
  setLang: (lang: DashLang) => void;
  title: (value: string) => string;
  nav: (href: string) => string;
  status: (value: string) => string;
  source: (value: string) => string;
  service: (value: string) => string;
  c: (key: keyof typeof COPY.common) => string;
};

const DashI18nContext = createContext<DashI18nValue | null>(null);

export function DashI18nProvider({
  lang,
  setLang,
  children,
}: {
  lang: DashLang;
  setLang: (lang: DashLang) => void;
  children: ReactNode;
}) {
  const value = useMemo<DashI18nValue>(
    () => ({
      lang,
      dir: dashDir(lang),
      setLang,
      title: (v) => dashTitle(v, lang),
      nav: (href) => dashNavLabel(href, lang),
      status: (v) => dashStatus(v, lang),
      source: (v) => dashSource(v, lang),
      service: (v) => dashService(v, lang),
      c: (key) => dashCommon(key, lang),
    }),
    [lang, setLang],
  );
  return (
    <DashI18nContext.Provider value={value}>{children}</DashI18nContext.Provider>
  );
}

export function useDashI18n(): DashI18nValue {
  const ctx = useContext(DashI18nContext);
  const [lang, setLangState] = useState<DashLang>(readDashLang);

  useEffect(() => {
    function onLang(ev: Event) {
      const next = (ev as CustomEvent<DashLang>).detail;
      if (next === "en" || next === "ar") setLangState(next);
    }
    window.addEventListener(DASH_LANG_EVENT, onLang);
    return () => window.removeEventListener(DASH_LANG_EVENT, onLang);
  }, []);

  const setLang = useCallback((next: DashLang) => {
    setLangState(next);
    applyDashLang(next);
  }, []);

  const value = useMemo<DashI18nValue>(
    () => ({
      lang,
      dir: dashDir(lang),
      setLang,
      title: (v) => dashTitle(v, lang),
      nav: (href) => dashNavLabel(href, lang),
      status: (v) => dashStatus(v, lang),
      source: (v) => dashSource(v, lang),
      service: (v) => dashService(v, lang),
      c: (key) => dashCommon(key, lang),
    }),
    [lang, setLang],
  );

  return ctx || value;
}

export function DashLtr({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={className ? `dash-ltr ${className}` : "dash-ltr"} dir="ltr">
      {children}
    </span>
  );
}
