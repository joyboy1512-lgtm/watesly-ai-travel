"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { APP_NAME } from "@watesly-travel/shared";
import { apiFetch } from "@/lib/api";
import "../assistant.css";

const SESSION_KEY = "watesly_web_chat_session";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

function getSessionId() {
  if (typeof window === "undefined") return "";
  let value = localStorage.getItem(SESSION_KEY);
  if (!value) {
    value =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, value);
  }
  return value;
}

export default function PublicChatPage() {
  const [sessionId, setSessionId] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Bubble[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً. كيف أساعدك في تخطيط رحلتك؟",
    },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    apiFetch<{
      messages?: Array<{ id: string; role: string; content: string }>;
    }>(`/assistant/public/thread?sessionId=${encodeURIComponent(id)}`)
      .then((data) => {
        if (!data.messages?.length) return;
        setMessages(
          data.messages.map((row) => ({
            id: row.id,
            role: row.role === "user" ? "user" : "assistant",
            content: row.content,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, busy]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy || !sessionId) return;
    setBusy(true);
    setError("");
    setText("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    try {
      const result = await apiFetch<{ message: string }>("/assistant/public/chat", {
        method: "POST",
        body: JSON.stringify({ message, sessionId }),
        timeoutMs: 90000,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: result.message,
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الرد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="ta-public">
      <p className="prc-kicker">{APP_NAME}</p>
      <h1>محادثة السفر</h1>
      <p className="hint">
        Web Chat يعتمد على نفس Travel AI المستخدم في واتساب وتلجرام ولوحة التحكم.
      </p>
      {error ? <p className="cust-error">{error}</p> : null}
      <section className="prc-card ta-chat">
        <div className="ta-log" ref={logRef}>
          {messages.map((row) => (
            <div
              key={row.id}
              className={`ta-bubble ${row.role === "user" ? "user" : "assistant"}`}
            >
              {row.content}
            </div>
          ))}
          {busy ? <p className="hint">جارٍ البحث والرد...</p> : null}
        </div>
        <form className="ta-composer" onSubmit={onSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب وجهتك وتواريخ السفر"
          />
          <button className="btn" type="submit" disabled={busy || !text.trim()}>
            إرسال
          </button>
        </form>
      </section>
    </main>
  );
}
