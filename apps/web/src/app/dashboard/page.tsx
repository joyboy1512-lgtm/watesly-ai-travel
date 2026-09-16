"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getSession } from "@/lib/api";
import { formatDate, formatMoneyMinor } from "@/lib/format";

type WaitingConversation = {
  id: string;
  name: string;
  waId: string;
  preview: string;
  lastMessageAt?: string | null;
  unreadCount: number;
};

type Summary = {
  conversations: number;
  openConversations: number;
  pendingConversations: number;
  closedConversations: number;
  waitingReply: number;
  quotes: number;
  bookings: number;
  contacts: number;
  openHandoffs: number;
  inquiries: number;
  members: number;
  inboundToday: number;
  outboundToday: number;
  estimatedSalesMinor: number;
  confirmedSalesMinor: number;
  estimatedProfitMinor?: number;
  lastCampaign: {
    id: string;
    name: string;
    status: string;
    total: number;
    sent: number;
    failed: number;
    pending: number;
  } | null;
  subscription: {
    planCode: string;
    status: string;
    seatsLimit: number;
    members: number;
  };
  waitingConversations: WaitingConversation[];
};

const QUICK_ACTIONS = [
  {
    href: "/dashboard/conversations",
    title: "صندوق الوارد",
    desc: "الرد على محادثات واتساب",
    mark: "وارد",
  },
  {
    href: "/dashboard/whatsapp",
    title: "ربط واتساب",
    desc: "ربط رقم الأعمال والتوكن",
    mark: "واتساب",
  },
  {
    href: "/dashboard/templates",
    title: "قوالب واتساب",
    desc: "إنشاء قوالب للحملات والردود",
    mark: "قالب",
  },
  {
    href: "/dashboard/campaigns",
    title: "حملة واتساب",
    desc: "إرسال جماعي بقالب معتمد",
    mark: "حملة",
  },
];

function campaignStatusLabel(status: string) {
  if (status === "completed") return "مكتملة";
  if (status === "running") return "قيد التشغيل";
  if (status === "scheduled") return "مجدولة";
  if (status === "draft") return "مسودة";
  return status;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const session = getSession();

  useEffect(() => {
    apiFetch<Summary>("/reports/summary")
      .then(setSummary)
      .catch((err: Error) => setError(err.message));
  }, []);

  const seatsLimit = summary?.subscription.seatsLimit || 5;
  const members = summary?.subscription.members || 0;
  const seatsPct = Math.min(100, Math.round((members / seatsLimit) * 100));

  return (
    <AppShell title="لوحة التحكم" surface="dark">
      <div className="dash">
        <section className="dash-hero">
          <div>
            <p className="dash-hello">مرحباً، {session?.user.name || "المستخدم"}</p>
            <h3>مركز تشغيل مبيعات السفر</h3>
            <p className="hint">
              راقب المحادثات والعروض والحجوزات من شاشة واحدة بألوان مشروعك.
            </p>
          </div>
          <div className="dash-hero-actions">
            <Link className="btn secondary" href="/dashboard/campaigns">
              إنشاء حملة جديدة
            </Link>
            <Link className="btn" href="/dashboard/inquiries">
              + استعلام سفر
            </Link>
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}

        {(summary?.openHandoffs || 0) > 0 ? (
          <div className="dash-banner">
            لديك {summary?.openHandoffs} تحويل بشري بانتظار المتابعة
          </div>
        ) : null}

        <section className="dash-quick">
          {QUICK_ACTIONS.map((item) => (
            <Link key={item.href} href={item.href} className="dash-quick-card">
              <span className="dash-mark">{item.mark}</span>
              <strong>{item.title}</strong>
              <p>{item.desc}</p>
            </Link>
          ))}
        </section>

        <section className="dash-stats">
          <div className="dash-stat">
            <span>محادثات مفتوحة</span>
            <strong>{summary?.openConversations ?? "—"}</strong>
            <small>معلقة: {summary?.pendingConversations ?? 0}</small>
          </div>
          <div className="dash-stat">
            <span>رسائل اليوم</span>
            <strong>
              {(summary?.inboundToday ?? 0) + (summary?.outboundToday ?? 0)}
            </strong>
            <small>
              وارد {summary?.inboundToday ?? 0} · صادر {summary?.outboundToday ?? 0}
            </small>
          </div>
          <div className="dash-stat">
            <span>عروض الأسعار</span>
            <strong>{summary?.quotes ?? "—"}</strong>
            <small>حجوزات: {summary?.bookings ?? 0}</small>
          </div>
          <div className="dash-stat">
            <span>بانتظار ردك</span>
            <strong>{summary?.waitingReply ?? "—"}</strong>
            <small>تحويلات: {summary?.openHandoffs ?? 0}</small>
          </div>
          <div className="dash-stat">
            <span>مبيعات تقديرية</span>
            <strong>{formatMoneyMinor(summary?.estimatedSalesMinor)}</strong>
            <small>
              مؤكدة: {formatMoneyMinor(summary?.confirmedSalesMinor)}
            </small>
          </div>
          {summary?.estimatedProfitMinor != null ? (
            <div className="dash-stat">
              <span>ربح تقديري</span>
              <strong>{formatMoneyMinor(summary.estimatedProfitMinor)}</strong>
              <small>داخلي للمصرّح فقط</small>
            </div>
          ) : (
            <div className="dash-stat">
              <span>العملاء</span>
              <strong>{summary?.contacts ?? "—"}</strong>
              <small>استعلامات: {summary?.inquiries ?? 0}</small>
            </div>
          )}
        </section>

        <section className="dash-split">
          <div className="dash-card">
            <div className="dash-card-head">
              <h3>تنتظر ردك</h3>
              <Link href="/dashboard/conversations">صندوق الوارد</Link>
            </div>
            {(summary?.waitingConversations?.length || 0) === 0 ? (
              <div className="dash-empty">
                <p>لا توجد محادثات بانتظار الرد حاليًا.</p>
                <Link className="btn secondary" href="/dashboard/conversations">
                  فتح المحادثات
                </Link>
              </div>
            ) : (
              <div className="dash-wait-list">
                {summary?.waitingConversations.map((c) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/conversations?id=${c.id}`}
                    className="dash-wait-item"
                  >
                    <div className="dash-avatar">{c.name.slice(0, 1)}</div>
                    <div>
                      <strong>{c.name}</strong>
                      <p>{c.preview || c.waId}</p>
                    </div>
                    <time>{formatDate(c.lastMessageAt)}</time>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <h3>آخر حملة</h3>
              <Link href="/dashboard/campaigns">كل الحملات</Link>
            </div>
            {!summary?.lastCampaign ? (
              <div className="dash-empty">
                <p>لم تُنشأ حملات بعد.</p>
                <Link className="btn" href="/dashboard/campaigns">
                  إنشاء حملة
                </Link>
              </div>
            ) : (
              <div className="dash-campaign">
                <div className="dash-campaign-top">
                  <strong>{summary.lastCampaign.name}</strong>
                  <span className="dash-badge">
                    {campaignStatusLabel(summary.lastCampaign.status)}
                    {summary.lastCampaign.failed > 0 ? " بأخطاء" : ""}
                  </span>
                </div>
                <div className="dash-campaign-grid">
                  <div>
                    <span>الإجمالي</span>
                    <strong>{summary.lastCampaign.total}</strong>
                  </div>
                  <div>
                    <span>أُرسل</span>
                    <strong>{summary.lastCampaign.sent}</strong>
                  </div>
                  <div>
                    <span>معلّق</span>
                    <strong>{summary.lastCampaign.pending}</strong>
                  </div>
                  <div>
                    <span>فشل</span>
                    <strong className={summary.lastCampaign.failed ? "danger" : ""}>
                      {summary.lastCampaign.failed}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="dash-split">
          <div className="dash-card">
            <div className="dash-card-head">
              <h3>ملخص المحادثات</h3>
            </div>
            <div className="dash-summary-rows">
              <div>
                <span>مفتوحة</span>
                <strong>{summary?.openConversations ?? 0}</strong>
              </div>
              <div>
                <span>قيد الانتظار</span>
                <strong>{summary?.pendingConversations ?? 0}</strong>
              </div>
              <div>
                <span>مغلقة</span>
                <strong>{summary?.closedConversations ?? 0}</strong>
              </div>
              <div>
                <span>جهات الاتصال</span>
                <strong>{summary?.contacts ?? 0}</strong>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-head">
              <h3>الاشتراك</h3>
              <span className="dash-badge soft">
                {summary?.subscription.planCode || "trial"}
              </span>
            </div>
            <p className="hint" style={{ marginTop: 0 }}>
              حالة الخطة: {summary?.subscription.status || "trialing"}
            </p>
            <div className="dash-meter">
              <div className="dash-meter-label">
                <span>الموظفون</span>
                <span>
                  {members}/{seatsLimit}
                </span>
              </div>
              <div className="dash-meter-track">
                <div
                  className="dash-meter-fill"
                  style={{ width: `${seatsPct}%` }}
                />
              </div>
            </div>
            <div className="dash-meter">
              <div className="dash-meter-label">
                <span>قناة واتساب</span>
                <span>1/1</span>
              </div>
              <div className="dash-meter-track">
                <div className="dash-meter-fill" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
