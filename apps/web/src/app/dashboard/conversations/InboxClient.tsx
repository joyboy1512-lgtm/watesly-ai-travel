"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch, apiUpload, getSession } from "@/lib/api";
import { formatDate } from "@/lib/format";

type ConversationRow = {
  id: string;
  status: string;
  assigneeType: string;
  assignedUserId?: string | null;
  unreadCount: number;
  lastMessageAt?: string;
  contact: { waId: string; name?: string | null };
  whatsappAccount?: {
    id: string;
    displayPhone?: string | null;
    channelName?: string | null;
    channelType?: string | null;
    phoneNumberId: string;
  } | null;
  messages: Array<{
    body?: string | null;
    direction?: string;
    createdAt?: string;
    type?: string;
    templateName?: string | null;
    rawPayload?: { mediaUrl?: string; filename?: string; mediaType?: string } | null;
  }>;
};

type ConversationDetail = {
  id: string;
  status: string;
  assigneeType: string;
  assignedUserId?: string | null;
  withinCustomerServiceWindow?: boolean;
  contact: { id: string; waId: string; name?: string | null; email?: string | null };
  whatsappAccount?: {
    id: string;
    displayPhone?: string | null;
    channelName?: string | null;
    channelType?: string | null;
    phoneNumberId: string;
    status?: string;
  } | null;
  messages: Array<{
    id: string;
    direction: string;
    body?: string | null;
    createdAt: string;
    status: string;
    type?: string;
    templateName?: string | null;
    rawPayload?: { mediaUrl?: string; filename?: string; mediaType?: string } | null;
  }>;
  inquiries: Array<{
    id: string;
    status: string;
    aiSummary?: string | null;
    origin?: string | null;
    destination?: string | null;
  }>;
};

type Template = {
  id: string;
  name: string;
  body: string;
  language?: string;
  status?: string;
};

type FilterTab = "all" | "waiting" | "unread" | "mine";

const SAMPLE_CUSTOMERS = [
  {
    name: "أحمد المسافر",
    waId: "966501111001",
    text: "مرحبا، أبغى تذكرة من الرياض إلى دبي بتاريخ 2026-09-20 لشخصين",
  },
  {
    name: "سارة العتيبي",
    waId: "966502222002",
    text: "ممكن عرض سعر من جدة إلى القاهرة؟",
  },
  {
    name: "خالد العمري",
    waId: "966503333003",
    text: "من الدمام إلى إسطنبول 2026-10-05 economy بالغ واحد",
  },
];

function initials(name?: string | null, waId?: string) {
  const source = (name || waId || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function windowOpen(messages: ConversationDetail["messages"]) {
  const lastInbound = [...messages]
    .reverse()
    .find((m) => m.direction === "inbound");
  if (!lastInbound) return false;
  const age = Date.now() - new Date(lastInbound.createdAt).getTime();
  return age <= 24 * 60 * 60 * 1000;
}

const CHANNEL_KIND: Record<string, string> = {
  whatsapp: "واتساب",
  telegram: "تلجرام",
  instagram: "إنستغرام",
  messenger: "ماسنجر",
};

function channelKindOf(row?: {
  whatsappAccount?: { channelType?: string | null } | null;
}) {
  return row?.whatsappAccount?.channelType || "whatsapp";
}

function formatMsgTime(value: string) {
  try {
    return new Intl.DateTimeFormat("ar", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function formatListTime(value?: string) {
  if (!value) return "";
  try {
    const d = new Date(value);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return new Intl.DateTimeFormat("ar", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    ) {
      return "أمس";
    }
    return new Intl.DateTimeFormat("ar", {
      day: "numeric",
      month: "short",
    }).format(d);
  } catch {
    return "";
  }
}

function formatDayLabel(value: string) {
  const d = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "اليوم";
  if (sameDay(d, yesterday)) return "أمس";
  try {
    return new Intl.DateTimeFormat("ar", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(d);
  } catch {
    return formatDate(value);
  }
}

function dayKey(value: string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function mediaPreview(msg?: { body?: string | null; type?: string; direction?: string }) {
  if (!msg) return "بدون رسائل";
  const t = (msg.type || "text").toLowerCase();
  if (t === "image") return "📷 صورة";
  if (t === "video") return "🎬 فيديو";
  if (t === "document") return "📄 ملف PDF";
  return msg.body || "بدون رسائل";
}

function mediaFromPayload(raw?: { mediaUrl?: string; filename?: string; mediaType?: string } | null) {
  return {
    url: raw?.mediaUrl || "",
    filename: raw?.filename || "",
    kind: (raw?.mediaType || "").toLowerCase(),
  };
}

function statusTicks(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "read" || s === "seen") return "read";
  if (s === "delivered" || s === "received") return "delivered";
  if (s === "failed" || s === "error") return "failed";
  return "sent";
}

export default function InboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("id");
  const session = getSession();

  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [query, setQuery] = useState("");
  const [reply, setReply] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [priority, setPriority] = useState("عادية");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [simName, setSimName] = useState(SAMPLE_CUSTOMERS[0]!.name);
  const [simWaId, setSimWaId] = useState(SAMPLE_CUSTOMERS[0]!.waId);
  const [simText, setSimText] = useState(SAMPLE_CUSTOMERS[0]!.text);

  const threadRef = useRef<HTMLDivElement>(null);
  const isOpen = detail
    ? detail.withinCustomerServiceWindow ?? windowOpen(detail.messages)
    : true;
  const channelLabel = (row: {
    whatsappAccount?: ConversationRow["whatsappAccount"];
  }) => {
    const kind = CHANNEL_KIND[channelKindOf(row)] || "قناة";
    return (
      row.whatsappAccount?.channelName ||
      row.whatsappAccount?.displayPhone ||
      kind
    );
  };
  const activeKind = channelKindOf(detail || undefined);
  const needsWindow = activeKind !== "telegram";

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "unread" && row.unreadCount < 1) return false;
      if (filter === "waiting") {
        const last = row.messages[0];
        if (!last || last.direction !== "inbound") return false;
      }
      if (filter === "mine") {
        const mine =
          row.assignedUserId === session?.user.id ||
          (row.assigneeType === "human" && !row.assignedUserId);
        if (!mine) return false;
      }
      if (!query.trim()) return true;
      const hay = `${row.contact.name || ""} ${row.contact.waId} ${row.messages[0]?.body || ""}`;
      return hay.includes(query.trim());
    });
  }, [rows, filter, query]);

  async function loadList() {
    const data = await apiFetch<ConversationRow[]>("/conversations");
    setRows(data);
    return data;
  }

  async function loadDetail(id: string) {
    const data = await apiFetch<ConversationDetail>(`/conversations/${id}`);
    setDetail(data);
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, unreadCount: 0 } : row)),
    );
  }

  useEffect(() => {
    if (!getSession()?.accessToken) return;
    loadList().catch((err: Error) => setError(err.message));
    apiFetch<Template[]>("/campaigns/templates")
      .then((list) => {
        setTemplates(list);
        if (list[0]) setTemplateId(list[0].id);
      })
      .catch(() => undefined);

    const timer = setInterval(() => {
      if (!getSession()?.accessToken) return;
      loadList().catch(() => undefined);
      if (selectedId) loadDetail(selectedId).catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId).catch((err: Error) => setError(err.message));
  }, [selectedId]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [detail?.messages.length, selectedId]);

  function selectConversation(id: string) {
    router.replace(`/dashboard/conversations?id=${id}`);
  }

  async function simulateCustomer() {
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<{
        items: Array<{ conversationId?: string }>;
      }>("/whatsapp/simulate", {
        method: "POST",
        body: JSON.stringify({
          waId: simWaId.trim(),
          text: simText.trim(),
          name: simName.trim() || simWaId.trim(),
        }),
      });
      const list = await loadList();
      const nextId =
        result.items?.[0]?.conversationId ||
        list.find((r) => r.contact.waId === simWaId.trim())?.id ||
        list[0]?.id;
      if (nextId) {
        selectConversation(nextId);
        await loadDetail(nextId);
      }
      setSimText("");
      setShowSimulator(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل محاكاة العميل");
    } finally {
      setBusy(false);
    }
  }

  async function sendAsCustomer() {
    if (!detail || !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/whatsapp/simulate", {
        method: "POST",
        body: JSON.stringify({
          waId: detail.contact.waId,
          text: reply.trim(),
          name: detail.contact.name || detail.contact.waId,
        }),
      });
      setReply("");
      await Promise.all([loadList(), loadDetail(detail.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال رسالة العميل");
    } finally {
      setBusy(false);
    }
  }

  function onPickFile(file: File | null) {
    if (!file) return;
    const mime = file.type.toLowerCase();
    const ok =
      ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/3gpp", "application/pdf"].includes(mime) ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!ok) {
      setError("يُسمح فقط بصورة أو فيديو MP4 أو ملف PDF");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      setError("حجم الملف يتجاوز 16MB");
      return;
    }
    setError("");
    setPendingFile(file);
    if (mime.startsWith("image/")) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview("");
    }
  }

  function clearPendingFile() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function sendAgentReply() {
    if (!detail) return;
    if (!isOpen) {
      setError("انتهت نافذة 24 ساعة — استخدم قالبًا معتمدًا");
      return;
    }
    if (!pendingFile && !reply.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (pendingFile) {
        const form = new FormData();
        form.append("file", pendingFile);
        if (reply.trim()) form.append("caption", reply.trim());
        await apiUpload(`/conversations/${detail.id}/media`, form);
        clearPendingFile();
        setReply("");
      } else {
        await apiFetch(`/conversations/${detail.id}/reply`, {
          method: "POST",
          body: JSON.stringify({ text: reply.trim() }),
        });
        setReply("");
      }
      await Promise.all([loadList(), loadDetail(detail.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرد");
    } finally {
      setBusy(false);
    }
  }

  async function sendTemplate() {
    if (!detail || !templateId) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/conversations/${detail.id}/reply-template`, {
        method: "POST",
        body: JSON.stringify({ templateId }),
      });
      await Promise.all([loadList(), loadDetail(detail.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل إرسال القالب");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(status: string) {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch(`/conversations/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await Promise.all([loadList(), loadDetail(detail.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحديث الحالة");
    } finally {
      setBusy(false);
    }
  }

  async function handoff() {
    if (!detail) return;
    await apiFetch(`/conversations/${detail.id}/handoff`, {
      method: "POST",
      body: JSON.stringify({ reason: "تحويل من صندوق المحادثات" }),
    });
    await Promise.all([loadList(), loadDetail(detail.id)]);
  }

  async function returnToBot() {
    if (!detail) return;
    await apiFetch(`/conversations/${detail.id}/return-to-bot`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    await Promise.all([loadList(), loadDetail(detail.id)]);
  }

  const statusLabel =
    detail?.status === "closed"
      ? "مغلقة"
      : detail?.status === "pending"
        ? "بانتظار الرد"
        : "مفتوحة";

  return (
    <AppShell title="المحادثات" dense>
      <div className="watesly-inbox wa-like">
        {/* قائمة المحادثات — يمين في RTL */}
        <aside className="wi-list">
          <div className="wi-list-head">
            <div className="wi-list-title-row">
              <h3>المحادثات</h3>
              <button
                type="button"
                className="wi-btn ghost"
                style={{ padding: "0.35rem 0.7rem" }}
                onClick={() => setShowSimulator((v) => !v)}
              >
                محاكاة
              </button>
            </div>
            <input
              className="wi-search"
              placeholder="بحث في المحادثات..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="wi-filters">
              {(
                [
                  ["all", "الكل"],
                  ["waiting", "بانتظار الرد"],
                  ["unread", "غير مقروءة"],
                  ["mine", "معي"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`wi-filter${filter === key ? " active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {showSimulator ? (
            <div className="wi-simulator">
              <strong>محاكاة عميل واتساب</strong>
              <div className="wi-sample-row">
                {SAMPLE_CUSTOMERS.map((sample) => (
                  <button
                    key={sample.waId}
                    type="button"
                    className="wi-chip"
                    onClick={() => {
                      setSimName(sample.name);
                      setSimWaId(sample.waId);
                      setSimText(sample.text);
                    }}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
              <input
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                placeholder="اسم العميل"
              />
              <input
                value={simWaId}
                onChange={(e) => setSimWaId(e.target.value)}
                placeholder="رقم واتساب"
              />
              <textarea
                rows={3}
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder="رسالة العميل..."
              />
              <button
                type="button"
                className="wi-btn primary"
                disabled={busy || !simWaId.trim() || !simText.trim()}
                onClick={simulateCustomer}
              >
                إرسال كعميل
              </button>
            </div>
          ) : null}

          <div className="wi-conversations">
            {filtered.length === 0 ? (
              <p className="wi-empty">لا توجد محادثات. اضغط + لمحاكاة عميل.</p>
            ) : (
              filtered.map((row) => {
                const active = row.id === selectedId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    className={`wi-item${active ? " active" : ""}${row.unreadCount ? " unread" : ""}`}
                    onClick={() => selectConversation(row.id)}
                  >
                    <div className="wi-avatar">
                      {initials(row.contact.name, row.contact.waId)}
                      <span className="wi-online" />
                    </div>
                    <div className="wi-item-main">
                      <div className="wi-item-top">
                        <strong>{row.contact.name || row.contact.waId}</strong>
                        <time>{formatListTime(row.lastMessageAt)}</time>
                      </div>
                      <p>
                        {row.messages[0]?.direction === "outbound" ? "✓ " : ""}
                        {mediaPreview(row.messages[0])}
                      </p>
                      <div className="wi-item-tags">
                        {row.unreadCount > 0 ? (
                          <span className="wi-pill count">{row.unreadCount}</span>
                        ) : (
                          <span className="wi-pill wa">{channelLabel(row)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* الشات الوسط */}
        <section className="wi-thread">
          {error ? <div className="wi-error">{error}</div> : null}

          {!selectedId || !detail ? (
            <div className="wi-placeholder">
              <h3>WeekendGate</h3>
              <p>اختر محادثة من القائمة للمراسلة عبر واتساب أو تلجرام أو إنستغرام أو ماسنجر.</p>
            </div>
          ) : (
            <>
              <header className="wi-thread-head">
                <div className="wi-thread-who">
                  <div className="wi-avatar lg">
                    {initials(detail.contact.name, detail.contact.waId)}
                    <span className="wi-online" />
                  </div>
                  <div>
                    <h3>{detail.contact.name || detail.contact.waId}</h3>
                    <p className="wi-thread-sub">
                      {detail.contact.waId} · {statusLabel} ·{" "}
                      {channelLabel(detail)}
                      {needsWindow
                        ? !isOpen
                          ? " · يتطلب قالب"
                          : " · نافذة 24س مفتوحة"
                        : " · تلجرام"}
                    </p>
                  </div>
                </div>
                <div className="wi-thread-actions">
                  <button
                    type="button"
                    className="wi-icon-btn"
                    title="تحويل لموظف"
                    onClick={handoff}
                  >
                    ↗
                  </button>
                  <button
                    type="button"
                    className="wi-icon-btn"
                    title="إعادة للروبوت"
                    onClick={returnToBot}
                  >
                    ↺
                  </button>
                </div>
              </header>

              <div className="wi-messages wa-chat-bg" ref={threadRef}>
                {detail.messages.map((msg, index) => {
                  const prev = detail.messages[index - 1];
                  const showDay =
                    !prev || dayKey(prev.createdAt) !== dayKey(msg.createdAt);
                  const tick =
                    msg.direction === "outbound"
                      ? statusTicks(msg.status)
                      : null;
                  return (
                    <div key={msg.id} className="wa-msg-block">
                      {showDay ? (
                        <div className="wa-day-chip">
                          {formatDayLabel(msg.createdAt)}
                        </div>
                      ) : null}
                      <div
                        className={`wi-bubble wa-bubble ${msg.direction === "inbound" ? "in" : "out"}`}
                      >
                        {msg.type === "template" || msg.templateName ? (
                          <div className="wi-bubble-tpl">
                            قالب: {msg.templateName || "WhatsApp"}
                          </div>
                        ) : null}
                        {(() => {
                          const media = mediaFromPayload(msg.rawPayload);
                          const kind = (msg.type || media.kind || "").toLowerCase();
                          if (kind === "image" && media.url) {
                            return (
                              <a href={media.url} target="_blank" rel="noreferrer" className="wi-media">
                                <img src={media.url} alt={msg.body || "صورة"} />
                              </a>
                            );
                          }
                          if (kind === "video" && media.url) {
                            return (
                              <video className="wi-media-video" src={media.url} controls preload="metadata" />
                            );
                          }
                          if (kind === "document" && media.url) {
                            return (
                              <a
                                href={media.url}
                                target="_blank"
                                rel="noreferrer"
                                className="wi-file-chip"
                              >
                                📄 {media.filename || "ملف PDF"}
                              </a>
                            );
                          }
                          return null;
                        })()}
                        {msg.body ? (
                          <div className="wi-bubble-text">{msg.body}</div>
                        ) : null}
                        <div className="wi-bubble-meta">
                          <span>{formatMsgTime(msg.createdAt)}</span>
                          {tick ? (
                            <span className={`wa-ticks ${tick}`} aria-hidden>
                              {tick === "failed" ? "!" : "✓✓"}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {!isOpen ? (
                  <div className="wi-window-banner">
                    <strong>انتهت نافذة خدمة 24 ساعة</strong>
                    <p>
                      لا يمكن إرسال رسائل نصية حرة. استخدم قالب WhatsApp معتمد
                      للمتابعة.
                    </p>
                  </div>
                ) : null}
              </div>

              <footer className="wi-composer wa-composer">
                <div className="wi-template-bar">
                  <select
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    {templates.length === 0 ? (
                      <option value="">لا توجد قوالب — أنشئ من القوالب</option>
                    ) : (
                      templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.status ? ` (${t.status})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    className="wi-btn primary"
                    disabled={busy || !templateId}
                    onClick={sendTemplate}
                  >
                    إرسال قالب واتساب
                  </button>
                  <Link href="/dashboard/templates" className="wi-btn ghost">
                    القوالب
                  </Link>
                </div>
                {isOpen ? (
                  <>
                    {pendingFile ? (
                      <div className="wi-pending-file">
                        {pendingPreview ? (
                          <img src={pendingPreview} alt="" />
                        ) : (
                          <span>📎 {pendingFile.name}</span>
                        )}
                        <button type="button" onClick={clearPendingFile} title="إزالة">
                          ×
                        </button>
                      </div>
                    ) : null}
                    <div className="wi-composer-row">
                      <input
                        ref={fileRef}
                        type="file"
                        hidden
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp,application/pdf,.pdf"
                        onChange={(e) => onPickFile(e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        className="wa-composer-tool"
                        title="إرفاق صورة أو PDF أو فيديو"
                        disabled={busy}
                        onClick={() => fileRef.current?.click()}
                      >
                        📎
                      </button>
                      <button
                        type="button"
                        className="wa-composer-tool"
                        title="محاكاة كعميل"
                        disabled={busy || !reply.trim()}
                        onClick={sendAsCustomer}
                      >
                        ◐
                      </button>
                      <div className="wa-composer-input-wrap">
                        <textarea
                          rows={1}
                          value={reply}
                          onChange={(e) => setReply(e.target.value)}
                          placeholder={
                            pendingFile
                              ? "تعليق على الملف (اختياري)"
                              : `اكتب رسالة عبر ${CHANNEL_KIND[activeKind] || "القناة"}`
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void sendAgentReply();
                            }
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="wa-send-btn"
                        disabled={busy || (!reply.trim() && !pendingFile)}
                        onClick={sendAgentReply}
                        title="إرسال"
                      >
                        ➤
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="wi-composer-hint">
                    انتهت نافذة 24 ساعة — استخدم قالب واتساب معتمد أعلاه، أو انتظر
                    رسالة واردة من العميل.
                  </p>
                )}
              </footer>
            </>
          )}
        </section>

        {/* لوحة تفاصيل العميل — يسار في RTL */}
        <aside className="wi-details">
          {detail ? (
            <>
              <div className="wi-details-profile">
                <div className="wi-avatar xl">
                  {initials(detail.contact.name, detail.contact.waId)}
                </div>
                <h3>{detail.contact.name || detail.contact.waId}</h3>
                <p className="wi-phone">{detail.contact.waId}</p>
                <div className="wi-details-actions">
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/whatsapp")}
                  >
                    حساب القناة
                  </button>
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/channels")}
                  >
                    القنوات
                  </button>
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/templates")}
                  >
                    القوالب
                  </button>
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/campaigns")}
                  >
                    الحملات
                  </button>
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/contacts")}
                  >
                    ملف العميل
                  </button>
                  <button
                    type="button"
                    className="wi-btn ghost"
                    onClick={() => router.push("/dashboard/inquiries")}
                  >
                    استعلام السفر
                  </button>
                </div>
                <div className="wi-details-channel">
                  <strong>قناة الإرسال</strong>
                  <p>
                    {channelLabel(detail)}
                    {detail.whatsappAccount?.phoneNumberId
                      ? ` · ${detail.whatsappAccount.phoneNumberId}`
                      : " · غير مربوطة (ستُستخدم القناة الافتراضية عند الرد)"}
                  </p>
                </div>
              </div>

              <div className="wi-details-section">
                <h4>إدارة المحادثة</h4>
                <label>
                  <span>الموظف المسؤول</span>
                  <select
                    value={detail.assigneeType}
                    onChange={(e) => {
                      if (e.target.value === "human") void handoff();
                      else void returnToBot();
                    }}
                  >
                    <option value="bot">روبوت</option>
                    <option value="human">
                      {session?.user.name || "موظف"}
                    </option>
                  </select>
                </label>
                <label>
                  <span>الحالة</span>
                  <select
                    value={detail.status}
                    disabled={busy}
                    onChange={(e) => void updateStatus(e.target.value)}
                  >
                    <option value="open">مفتوحة</option>
                    <option value="pending">بانتظار الرد</option>
                    <option value="closed">مغلقة</option>
                  </select>
                </label>
                <label>
                  <span>الأولوية</span>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="عادية">عادية</option>
                    <option value="عالية">عالية</option>
                    <option value="عاجلة">عاجلة</option>
                  </select>
                </label>
              </div>

              <div className="wi-details-section">
                <h4>ملخص الطلب</h4>
                <p className="wi-summary">
                  {detail.inquiries[0]?.aiSummary ||
                    "لا يوجد استعلام سفر مرتبط بعد."}
                </p>
                {detail.inquiries[0] ? (
                  <p className="wi-summary-meta">
                    الحالة: {detail.inquiries[0].status}
                    {detail.inquiries[0].origin
                      ? ` · ${detail.inquiries[0].origin} → ${detail.inquiries[0].destination || "؟"}`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="wi-details-section">
                <h4>خدمات القناة</h4>
                <div className="wi-item-tags">
                  <span className="wi-pill wa">
                    {needsWindow
                      ? isOpen
                        ? "نافذة مفتوحة"
                        : "يتطلب قالب"
                      : CHANNEL_KIND[activeKind] || "قناة"}
                  </span>
                  <span className="wi-pill">
                    {detail.assigneeType === "human" ? "موظف" : "روبوت"}
                  </span>
                  <span className="wi-pill">{channelLabel(detail)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="wi-empty padded">
              اختر محادثة لعرض ملف العميل وإدارة المحادثة.
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
