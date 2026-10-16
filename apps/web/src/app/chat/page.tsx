"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatOfferBody } from "@/components/ChatOfferBody";
import { StoreFront } from "@/components/shop/StoreFront";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import "../assistant.css";
import "../shop.css";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

export default function PublicChatPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Bubble[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً. أدخل رقم جوالك لأبدأ مساعدتك في تخطيط رحلتك.",
    },
  ]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const session = getShopSession();
    if (!session) return;
    setUnlocked(true);
    setPhone(session.customer.phone);
    setName(session.customer.name || "");
    shopFetch<{ messages?: Array<{ id: string; role: string; content: string }> }>(
      "/shop/assistant/thread",
    )
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

  async function unlock(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await shopFetch<{
        accessToken: string;
        customer: {
          id: string;
          phone: string;
          email: string | null;
          name: string | null;
          status: string;
        };
      }>("/shop/unlock", {
        method: "POST",
        body: JSON.stringify({ phone, name }),
      });
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر فتح المساعد");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy || !unlocked) return;
    setBusy(true);
    setError("");
    setText("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    try {
      const result = await shopFetch<{ message: string }>("/shop/assistant/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
        timeoutMs: 90000,
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: result.message },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الرد");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreFront>
      <section className="shop-panel">
        <h1>مساعد السفر</h1>
        <p className="shop-hint">
          المساعد يعمل بعد إدخال رقم الجوال، ويرتبط بحسابك فقط.
        </p>
        {error ? <p className="shop-error">{error}</p> : null}
        {!unlocked ? (
          <form className="shop-form" onSubmit={unlock}>
            <label>
              الاسم
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              الجوال
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="965xxxxxxxx"
              />
            </label>
            <button className="shop-btn" type="submit" disabled={busy}>
              {busy ? "..." : "بدء المحادثة"}
            </button>
          </form>
        ) : (
          <section className="ta-chat">
            <div className="ta-log" ref={logRef}>
              {messages.map((row) => (
                <div
                  key={row.id}
                  className={`ta-msg ${row.role === "user" ? "out" : "in"}`}
                >
                  <div className={`ta-bubble ${row.role}`}>
                    <ChatOfferBody content={row.content} role={row.role} />
                  </div>
                </div>
              ))}
              {busy ? <p className="ta-typing">جارٍ البحث والرد...</p> : null}
            </div>
            <form className="ta-composer" onSubmit={onSubmit}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب وجهتك وتواريخ السفر"
              />
              <button className="shop-btn" type="submit" disabled={busy || !text.trim()}>
                إرسال
              </button>
            </form>
          </section>
        )}
      </section>
    </StoreFront>
  );
}
