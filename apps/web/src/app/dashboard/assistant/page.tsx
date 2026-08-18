"use client";

import {
  FormEvent,
  KeyboardEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import "../../assistant.css";

type ToolRow = { name: string; enabled: boolean; reason?: string };
type StatusPayload = { provider: string; model: string; tools: ToolRow[] };

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  model?: string | null;
};

type ThreadRow = {
  id: string;
  title?: string | null;
  channel: string;
  status: string;
  spentUsd: number;
  creditLimitUsd: number | null;
  remainingUsd: number | null;
  exhausted?: boolean;
  updatedAt: string;
  createdAt: string;
  preview?: string;
  conversationId?: string | null;
};

type UsageReport = {
  period: { key: string; from: string; to: string };
  totals: {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens: number;
    turns: number;
  };
  byChannel: Array<{ channel: string; costUsd: number; turns: number; tokens: number }>;
  byThread: Array<{
    threadId: string;
    title: string;
    channel: string;
    status: string;
    costUsd: number;
    turns: number;
    spentUsd: number;
    creditLimitUsd: number | null;
  }>;
  byDay: Array<{ date: string; costUsd: number; turns: number }>;
};

type AiSettings = { defaultThreadCreditUsd: number | null };

const CHANNEL_LABEL: Record<string, string> = {
  dashboard: "لوحة التحكم",
  whatsapp: "واتساب",
  telegram: "تلجرام",
  web_chat: "ويب",
};

function formatUsd(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (n === 0) return "$0.00";
  if (Math.abs(n) < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function dayKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar-KW", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function timeLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ar-KW", { hour: "2-digit", minute: "2-digit" });
}

function limitInputValue(value: number | null | undefined) {
  if (value == null) return "";
  return String(value);
}

function parseLimit(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function AssistantPageInner() {
  const router = useRouter();
  const search = useSearchParams();
  const wantedId = search.get("threadId") || "";

  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [active, setActive] = useState<ThreadRow | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [report, setReport] = useState<UsageReport | null>(null);
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [period, setPeriod] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sideTab, setSideTab] = useState<"credit" | "report" | "tools">("credit");
  const [threadLimit, setThreadLimit] = useState("");
  const [orgLimit, setOrgLimit] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const loadThreads = useCallback(async () => {
    const rows = await apiFetch<ThreadRow[]>(
      `/assistant/threads${channelFilter ? `?channel=${encodeURIComponent(channelFilter)}` : ""}`,
    );
    setThreads(rows);
    return rows;
  }, [channelFilter]);

  const loadReport = useCallback(async (nextPeriod = period) => {
    const params = new URLSearchParams({ period: nextPeriod });
    if (nextPeriod === "custom") {
      if (customFrom) params.set("from", customFrom);
      if (customTo) params.set("to", customTo);
    }
    const data = await apiFetch<UsageReport>(`/assistant/usage/report?${params}`);
    setReport(data);
  }, [period, customFrom, customTo]);

  const loadThread = useCallback(async (id: string) => {
    const data = await apiFetch<{
      thread: ThreadRow;
      messages: ChatMessage[];
    }>(`/assistant/thread?threadId=${encodeURIComponent(id)}`);
    setActive(data.thread);
    setThreadId(data.thread.id);
    setMessages(data.messages || []);
    setThreadLimit(limitInputValue(data.thread.creditLimitUsd));
    return data.thread;
  }, []);

  async function bootstrap() {
    const [st, cfg, rows] = await Promise.all([
      apiFetch<StatusPayload>("/assistant/tools"),
      apiFetch<AiSettings>("/assistant/settings"),
      loadThreads(),
    ]);
    setStatus(st);
    setSettings(cfg);
    setOrgLimit(limitInputValue(cfg.defaultThreadCreditUsd));
    await loadReport();
    let next = wantedId ? rows.find((row) => row.id === wantedId) : undefined;
    if (!next) next = rows[0];
    if (!next) {
      if (channelFilter) {
        setActive(null);
        setThreadId(undefined);
        setMessages([]);
        return;
      }
      const created = await apiFetch<ThreadRow>("/assistant/threads", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadThreads();
      next = created;
    }
    await loadThread(next.id);
    if (wantedId !== next.id) {
      router.replace(`/dashboard/assistant?threadId=${next.id}`);
    }
  }

  useEffect(() => {
    bootstrap().catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelFilter]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  const filteredThreads = useMemo(() => {
    const q = query.trim();
    if (!q) return threads;
    return threads.filter((row) =>
      `${row.title || ""} ${row.preview || ""} ${CHANNEL_LABEL[row.channel] || row.channel}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    );
  }, [threads, query]);

  const enabledCount = useMemo(
    () => status?.tools.filter((row) => row.enabled).length || 0,
    [status],
  );

  const spent = Number(active?.spentUsd || 0);
  const limit = active?.creditLimitUsd;
  const remaining = active?.remainingUsd;
  const usedPct =
    limit != null && limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
  const handedOff = active?.status === "handed_off";

  async function selectThread(id: string) {
    setError("");
    await loadThread(id);
    router.replace(`/dashboard/assistant?threadId=${id}`);
  }

  async function newChat() {
    setBusy(true);
    setError("");
    try {
      const created = await apiFetch<ThreadRow>("/assistant/threads", {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadThreads();
      await selectThread(created.id);
      setText("");
      composerRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء محادثة");
    } finally {
      setBusy(false);
    }
  }

  async function saveThreadLimit() {
    if (!threadId) return;
    setBusy(true);
    setError("");
    try {
      const row = await apiFetch<ThreadRow>(`/assistant/threads/${threadId}`, {
        method: "PATCH",
        body: JSON.stringify({ creditLimitUsd: parseLimit(threadLimit) }),
      });
      setActive(row);
      setThreadLimit(limitInputValue(row.creditLimitUsd));
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ حد الرصيد");
    } finally {
      setBusy(false);
    }
  }

  async function saveOrgLimit() {
    setBusy(true);
    setError("");
    try {
      const cfg = await apiFetch<AiSettings>("/assistant/settings", {
        method: "PATCH",
        body: JSON.stringify({ defaultThreadCreditUsd: parseLimit(orgLimit) }),
      });
      setSettings(cfg);
      setOrgLimit(limitInputValue(cfg.defaultThreadCreditUsd));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر حفظ الإعداد الافتراضي");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || busy || !threadId || handedOff) return;
    setBusy(true);
    setError("");
    setText("");
    const localId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: localId,
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ]);
    try {
      const result = await apiFetch<{
        threadId: string;
        message: string;
        model: string;
        handoff?: boolean;
        spentUsd?: number;
        creditLimitUsd?: number | null;
        remainingUsd?: number | null;
      }>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, threadId }),
        timeoutMs: 90000,
      });
      setMessages((prev) => [
        ...prev.filter((row) => row.id !== localId),
        {
          id: localId,
          role: "user",
          content: message,
          createdAt: new Date().toISOString(),
        },
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.message,
          createdAt: new Date().toISOString(),
          model: result.model,
        },
      ]);
      setActive((prev) =>
        prev
          ? {
              ...prev,
              id: result.threadId,
              spentUsd: result.spentUsd ?? prev.spentUsd,
              creditLimitUsd:
                result.creditLimitUsd === undefined
                  ? prev.creditLimitUsd
                  : result.creditLimitUsd,
              remainingUsd:
                result.remainingUsd === undefined ? prev.remainingUsd : result.remainingUsd,
              status: result.handoff ? "handed_off" : prev.status,
              title: prev.title || message.slice(0, 48),
            }
          : prev,
      );
      await Promise.all([loadThreads(), loadReport()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرد");
    } finally {
      setBusy(false);
      composerRef.current?.focus();
    }
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  }

  const maxDayCost = Math.max(0.000001, ...(report?.byDay.map((row) => row.costUsd) || [0]));

  return (
    <AppShell title="مساعد السفر" dense>
      <div className="ta-workspace">
        <aside className="ta-list">
          <div className="ta-list-head">
            <div className="ta-list-title">
              <h3>المحادثات</h3>
              <button type="button" className="ta-btn" onClick={() => void newChat()} disabled={busy}>
                محادثة جديدة
              </button>
            </div>
            <input
              className="ta-search"
              placeholder="بحث في المحادثات..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="ta-filters">
              {[
                ["", "الكل"],
                ["dashboard", "لوحة التحكم"],
                ["whatsapp", "واتساب"],
                ["web_chat", "ويب"],
                ["telegram", "تلجرام"],
              ].map(([key, label]) => (
                <button
                  key={key || "all"}
                  type="button"
                  className={`ta-filter${channelFilter === key ? " active" : ""}`}
                  onClick={() => setChannelFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="ta-thread-list">
            {filteredThreads.length === 0 ? (
              <p className="ta-empty">لا محادثات في هذا التصفية.</p>
            ) : (
              filteredThreads.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`ta-thread${row.id === threadId ? " active" : ""}`}
                  onClick={() => void selectThread(row.id)}
                >
                  <span className="ta-thread-top">
                    <strong>{row.title || "محادثة جديدة"}</strong>
                    <em>{timeLabel(row.updatedAt)}</em>
                  </span>
                  <span className="ta-thread-preview">{row.preview || "بدون رسائل بعد"}</span>
                  <span className="ta-thread-meta">
                    <i>{CHANNEL_LABEL[row.channel] || row.channel}</i>
                    <i className={row.status === "handed_off" ? "warn" : ""}>
                      {row.status === "handed_off" ? "محوّلة لموظف" : formatUsd(row.spentUsd)}
                    </i>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="ta-pane">
          <header className="ta-pane-head">
            <div>
              <h3>{active?.title || "محادثة المساعد"}</h3>
              <p>
                {status?.provider || "…"} · {status?.model || "…"} ·{" "}
                {CHANNEL_LABEL[active?.channel || "dashboard"]}
              </p>
            </div>
            <div className={`ta-meter${handedOff ? " off" : ""}`}>
              <span>
                {limit == null
                  ? `استهلاك ${formatUsd(spent)} · بدون حد`
                  : `استهلاك ${formatUsd(spent)} من ${formatUsd(limit)}`}
              </span>
              <b>
                {handedOff
                  ? "محوّلة لموظف"
                  : limit == null
                    ? "غير محدود"
                    : `متبقي ${formatUsd(remaining)}`}
              </b>
              {limit != null ? (
                <i className="ta-meter-bar">
                  <i style={{ width: `${usedPct}%` }} />
                </i>
              ) : null}
            </div>
          </header>

          {error ? <p className="ta-error">{error}</p> : null}
          {handedOff ? (
            <p className="ta-banner">
              نفذ رصيد هذه المحادثة أو طُلب موظف، لذلك يتولى الرد موظف بشري.
              ارفع حد الرصيد لإعادة المساعد.
            </p>
          ) : null}

          <div className="ta-log" ref={logRef}>
            {messages.length === 0 ? (
              <div className="ta-welcome">
                <strong>مرحباً — كيف أساعدك في تخطيط الرحلة؟</strong>
                <p>اطلب فندقاً أو رحلة أو مواصلات، أو حوّل المحادثة إلى موظف عند الحاجة.</p>
              </div>
            ) : (
              messages.map((row, index) => {
                const prev = messages[index - 1];
                const showDay = !prev || dayKey(prev.createdAt) !== dayKey(row.createdAt);
                return (
                  <div key={row.id}>
                    {showDay ? <div className="ta-day">{dayKey(row.createdAt)}</div> : null}
                    <div className={`ta-msg ${row.role === "user" ? "out" : "in"}`}>
                      <div className="ta-bubble">
                        <p>{row.content}</p>
                        <em>
                          {timeLabel(row.createdAt)}
                          {row.role !== "user" && row.model ? ` · ${row.model}` : ""}
                        </em>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {busy ? <p className="ta-typing">جارٍ التفكير واستخدام الأدوات...</p> : null}
          </div>

          <form className="ta-composer" onSubmit={(e) => void onSubmit(e)}>
            <textarea
              ref={composerRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onComposerKey}
              placeholder={
                handedOff
                  ? "المحادثة محوّلة لموظف — ارفع الرصيد لإعادة المساعد"
                  : "اكتب رسالة... Enter للإرسال، Shift+Enter لسطر جديد"
              }
              disabled={busy || handedOff}
              rows={1}
            />
            <button className="ta-send" type="submit" disabled={busy || handedOff || !text.trim()}>
              إرسال
            </button>
          </form>
        </section>

        <aside className="ta-side">
          <div className="ta-side-tabs">
            {(
              [
                ["credit", "الرصيد"],
                ["report", "التقرير"],
                ["tools", "الأدوات"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={sideTab === key ? "active" : ""}
                onClick={() => setSideTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {sideTab === "credit" ? (
            <div className="ta-side-body">
              <section>
                <h4>حد هذه المحادثة</h4>
                <p>عند نفاد الرصيد يُحوّل الرد تلقائياً إلى موظف.</p>
                <label className="ta-field">
                  الحد بالدولار
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="بدون حد"
                    value={threadLimit}
                    onChange={(e) => setThreadLimit(e.target.value)}
                  />
                </label>
                <button type="button" className="ta-btn solid" onClick={() => void saveThreadLimit()} disabled={busy}>
                  حفظ حد المحادثة
                </button>
                <ul className="ta-facts">
                  <li>المستهلك: {formatUsd(spent)}</li>
                  <li>الحد: {limit == null ? "غير محدود" : formatUsd(limit)}</li>
                  <li>المتبقي: {limit == null ? "—" : formatUsd(remaining)}</li>
                </ul>
              </section>
              <section>
                <h4>الحد الافتراضي للمحادثات الجديدة</h4>
                <p>يُطبَّق عند إنشاء شات جديد من اللوحة أو واتساب أو الويب.</p>
                <label className="ta-field">
                  الحد الافتراضي بالدولار
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="بدون حد"
                    value={orgLimit}
                    onChange={(e) => setOrgLimit(e.target.value)}
                  />
                </label>
                <button type="button" className="ta-btn solid" onClick={() => void saveOrgLimit()} disabled={busy}>
                  حفظ الافتراضي
                </button>
                <p className="ta-hint">
                  الحالي:{" "}
                  {settings?.defaultThreadCreditUsd == null
                    ? "بدون حد"
                    : formatUsd(settings.defaultThreadCreditUsd)}
                </p>
              </section>
            </div>
          ) : null}

          {sideTab === "report" ? (
            <div className="ta-side-body">
              <section>
                <h4>استهلاك الذكاء الاصطناعي</h4>
                <div className="ta-filters">
                  {[
                    ["today", "اليوم"],
                    ["7d", "7 أيام"],
                    ["30d", "30 يوماً"],
                    ["custom", "مخصص"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`ta-filter${period === key ? " active" : ""}`}
                      onClick={() => {
                        setPeriod(key);
                        if (key !== "custom") {
                          void loadReport(key).catch((err: Error) => setError(err.message));
                        }
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {period === "custom" ? (
                  <div className="ta-custom-range">
                    <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                    <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                    <button
                      type="button"
                      className="ta-btn"
                      onClick={() => void loadReport("custom").catch((err: Error) => setError(err.message))}
                    >
                      عرض
                    </button>
                  </div>
                ) : null}
                <div className="ta-stats">
                  <div>
                    <span>التكلفة</span>
                    <strong>{formatUsd(report?.totals.costUsd || 0)}</strong>
                  </div>
                  <div>
                    <span>الردود</span>
                    <strong>{report?.totals.turns || 0}</strong>
                  </div>
                  <div>
                    <span>Tokens</span>
                    <strong>
                      {(report?.totals.inputTokens || 0) + (report?.totals.outputTokens || 0)}
                    </strong>
                  </div>
                </div>
              </section>
              <section>
                <h4>حسب القناة</h4>
                {(report?.byChannel || []).length === 0 ? (
                  <p className="ta-hint">لا استهلاك في هذه المدة.</p>
                ) : (
                  <table className="ta-table">
                    <tbody>
                      {report!.byChannel.map((row) => (
                        <tr key={row.channel}>
                          <td>{CHANNEL_LABEL[row.channel] || row.channel}</td>
                          <td>{row.turns}</td>
                          <td>{formatUsd(row.costUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
              <section>
                <h4>حسب اليوم</h4>
                <div className="ta-days">
                  {(report?.byDay || []).map((row) => (
                    <div key={row.date} className="ta-day-row" title={`${row.turns} ردود`}>
                      <span>{row.date.slice(5)}</span>
                      <i>
                        <b style={{ width: `${(row.costUsd / maxDayCost) * 100}%` }} />
                      </i>
                      <em>{formatUsd(row.costUsd)}</em>
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <h4>حسب المحادثة</h4>
                {(report?.byThread || []).length === 0 ? (
                  <p className="ta-hint">لا بيانات.</p>
                ) : (
                  <div className="ta-usage-threads">
                    {report!.byThread.map((row) => (
                      <button
                        key={row.threadId}
                        type="button"
                        className="ta-usage-thread"
                        onClick={() => row.threadId !== "none" && void selectThread(row.threadId)}
                      >
                        <strong>{row.title}</strong>
                        <span>
                          {CHANNEL_LABEL[row.channel] || row.channel} · {row.turns} ردود ·{" "}
                          {formatUsd(row.costUsd)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}

          {sideTab === "tools" ? (
            <div className="ta-side-body">
              <section>
                <h4>الأدوات المفعّلة {enabledCount}</h4>
                <div className="ta-tools">
                  {(status?.tools || []).map((row) => (
                    <span
                      key={row.name}
                      className={`ta-pill${row.enabled ? "" : " off"}`}
                      title={row.reason || ""}
                    >
                      {row.enabled ? "●" : "○"} {row.name}
                    </span>
                  ))}
                </div>
                <ul className="ta-hint-list">
                  {(status?.tools || [])
                    .filter((row) => !row.enabled && row.reason)
                    .map((row) => (
                      <li key={`${row.name}-reason`}>
                        {row.name}: {row.reason}
                      </li>
                    ))}
                </ul>
              </section>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="مساعد السفر" dense>
          <p className="ta-hint">جارٍ تحميل المساعد...</p>
        </AppShell>
      }
    >
      <AssistantPageInner />
    </Suspense>
  );
}
