"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChatOfferBody } from "@/components/ChatOfferBody";
import { StoreFront } from "@/components/shop/StoreFront";
import { ShopVoiceComposer } from "@/components/shop/ShopVoiceComposer";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import "../assistant.css";
import "../shop.css";

type Bubble = { id: string; role: "user" | "assistant"; content: string };

export default function PublicChatPage() {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [needsUnlockCode, setNeedsUnlockCode] = useState(false);
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

  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

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
      if (needsUnlockCode) {
        const result = await verifyShopUnlock({ phone, name, code: unlockCode });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        setUnlocked(true);
        setNeedsUnlockCode(false);
        return;
      }
      const result = await unlockShopCustomer({ phone, name });
      if (result.needsCode) {
        setNeedsUnlockCode(true);
        if (result.debugCode) setUnlockCode(result.debugCode);
        return;
      }
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

  async function sendMessage(message: string) {
    if (!message || busy || !unlocked) return;
    setBusy(true);
    setError("");
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    setText("");
    await sendMessage(message);
  }

  async function confirmVoice() {
    const transcript = (pendingTranscript || "").trim();
    if (!transcript) return;
    setPendingTranscript(null);
    setBusy(true);
    setError("");
    setMessages((prev) => [
      ...prev,
      { id: `u-v-${Date.now()}`, role: "user", content: `🎤 ${transcript}` },
    ]);
    try {
      const result = await shopFetch<{ message: string }>(
        "/shop/assistant/voice/confirm",
        {
          method: "POST",
          body: JSON.stringify({ transcript }),
          timeoutMs: 90000,
        },
      );
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
                disabled={needsUnlockCode}
              />
            </label>
            {needsUnlockCode ? (
              <label>
                رمز التحقق
                <input
                  value={unlockCode}
                  onChange={(e) => setUnlockCode(e.target.value)}
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6 أرقام"
                />
              </label>
            ) : null}
            <button className="shop-btn" type="submit" disabled={busy}>
              {busy ? "..." : needsUnlockCode ? "تأكيد الرمز" : "بدء المحادثة"}
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
            {pendingTranscript ? (
              <div className="shop-voice-confirm">
                <strong>راجع النص قبل التنفيذ</strong>
                <textarea
                  value={pendingTranscript}
                  onChange={(e) => setPendingTranscript(e.target.value)}
                  rows={3}
                />
                <div className="shop-voice-review-actions">
                  <button type="button" className="shop-btn" onClick={() => void confirmVoice()}>
                    تأكيد وإرسال
                  </button>
                  <button
                    type="button"
                    className="shop-btn ghost"
                    onClick={() => setPendingTranscript(null)}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            ) : null}
            <ShopVoiceComposer
              disabled={busy || Boolean(pendingTranscript)}
              onError={setError}
              onTranscriptReady={(transcript, meta) => {
                if (!transcript) {
                  setError(meta.messageAr || "الصوت غير واضح، حاول مرة أخرى");
                  return;
                }
                if (meta.needsConfirm) {
                  setPendingTranscript(transcript);
                  return;
                }
                void sendMessage(transcript);
              }}
            />
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
