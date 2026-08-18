"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import "../../assistant.css";

type ToolRow = {
  name: string;
  enabled: boolean;
  reason?: string;
};

type StatusPayload = {
  provider: string;
  model: string;
  tools: ToolRow[];
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  model?: string | null;
};

type UsageRow = {
  id: string;
  provider: string;
  model: string;
  channel?: string | null;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  totalTokens: number;
  estimatedCostUsd: string | number;
  openaiResponseId?: string | null;
  createdAt: string;
};

export default function AssistantPage() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [st, thread, logs] = await Promise.all([
      apiFetch<StatusPayload>("/assistant/tools"),
      apiFetch<{
        thread: { id: string };
        messages: ChatMessage[];
      }>("/assistant/thread"),
      apiFetch<UsageRow[]>("/assistant/usage"),
    ]);
    setStatus(st);
    setThreadId(thread.thread.id);
    setMessages(thread.messages || []);
    setUsage(logs);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  const enabledCount = useMemo(
    () => status?.tools.filter((row) => row.enabled).length || 0,
    [status],
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    setText("");
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}`,
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
      }>("/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message, threadId }),
        timeoutMs: 90000,
      });
      setThreadId(result.threadId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الرد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="مساعد السفر">
      <div className="prc-suite ta-suite">
        <section className="prc-hero">
          <div>
            <p className="prc-kicker">Travel AI Brain</p>
            <h3>اختبار وإدارة المساعد الموحد</h3>
            <p>
              نفس المحرك يخدم لوحة التحكم وWeb Chat وواتساب وتلجرام. المفتاح
              يبقى على السيرفر فقط.
            </p>
          </div>
          <div>
            <span className="wa-pill soft">
              {status?.provider || "…"} · {status?.model || "…"}
            </span>
            <p className="hint" style={{ margin: "0.6rem 0 0" }}>
              أدوات مفعّلة: {enabledCount}
            </p>
          </div>
        </section>

        {error ? <p className="cust-error">{error}</p> : null}

        <div className="ta-grid">
          <section className="prc-card ta-chat">
            <div className="prc-card-head">
              <h4>محادثة الموظف</h4>
              <p>قناة dashboard — لا تعتمد على userId فقط، الجلسة مربوطة بالمنظمة والموظف</p>
            </div>
            <div className="ta-log" ref={logRef}>
              {messages.length === 0 ? (
                <p className="hint">ابدأ بطلب فندق أو رحلة أو تحويل إلى موظف.</p>
              ) : (
                messages.map((row) => (
                  <div
                    key={row.id}
                    className={`ta-bubble ${row.role === "user" ? "user" : "assistant"}`}
                  >
                    {row.content}
                  </div>
                ))
              )}
              {busy ? <p className="hint">جارٍ التفكير واستخدام الأدوات...</p> : null}
            </div>
            <form className="ta-composer" onSubmit={onSubmit}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="مثال: أريد فندقاً في دبي من 20 إلى 23 سبتمبر لشخصين"
              />
              <button className="btn" type="submit" disabled={busy || !text.trim()}>
                إرسال
              </button>
            </form>
          </section>

          <div className="ta-suite">
            <section className="prc-card">
              <div className="prc-card-head">
                <h4>الأدوات</h4>
                <p>المعطّل ينتظر بيانات اعتماد — لن يُعرض كمخزون حقيقي</p>
              </div>
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
              <ul className="hint" style={{ marginTop: "0.8rem" }}>
                {(status?.tools || [])
                  .filter((row) => !row.enabled && row.reason)
                  .map((row) => (
                    <li key={`${row.name}-reason`}>
                      {row.name}: {row.reason}
                    </li>
                  ))}
              </ul>
            </section>

            <section className="prc-card">
              <div className="prc-card-head">
                <h4>استهلاك AI</h4>
                <p>model · tokens · التكلفة التقديرية · response ID</p>
              </div>
              <div className="ta-usage">
                {usage.length === 0 ? (
                  <p className="hint">لا سجلات بعد.</p>
                ) : (
                  <table className="cust-table prc-table">
                    <thead>
                      <tr>
                        <th>القناة</th>
                        <th>النموذج</th>
                        <th>in/out/cache</th>
                        <th>USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usage.slice(0, 12).map((row) => (
                        <tr key={row.id} title={row.openaiResponseId || ""}>
                          <td>{row.channel || "—"}</td>
                          <td className="cust-mono">{row.model}</td>
                          <td>
                            {row.inputTokens}/{row.outputTokens}/
                            {row.cachedInputTokens}
                          </td>
                          <td>{String(row.estimatedCostUsd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
