"use client";

import { FormEvent, useEffect, useState } from "react";
import { ChatOfferBody } from "@/components/ChatOfferBody";
import { ShopVoiceComposer } from "@/components/shop/ShopVoiceComposer";
import {
  getShopSession,
  saveShopSession,
  shopFetch,
  getShopToken,
} from "@/lib/shop-session";

type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioBase64?: string;
  audioMime?: string;
};

export function ShopAssistant() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [pendingHint, setPendingHint] = useState("");
  const [messages, setMessages] = useState<Bubble[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "مرحباً بك في WeekendGate. أدخل رقم جوالك لأبدأ مساعدتك في تخطيط الرحلة.",
    },
  ]);

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
        if (data.messages?.length) {
          setMessages(
            data.messages.map((row) => ({
              id: row.id,
              role: row.role === "user" ? "user" : "assistant",
              content: row.content,
            })),
          );
          return;
        }
        setMessages([
          {
            id: "welcome-back",
            role: "assistant",
            content: "مرحباً بعودتك! كيف يمكنني مساعدتك في تخطيط رحلتك؟",
          },
        ]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!open) return;
    const session = getShopSession();
    if (!session) return;
    setUnlocked(true);
    setPhone(session.customer.phone);
    setName(session.customer.name || "");
  }, [open]);

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
      setMessages([
        {
          id: "welcome-unlocked",
          role: "assistant",
          content: "مرحباً! كيف يمكنني مساعدتك في تخطيط رحلتك؟ يمكنك الكتابة أو إرسال رسالة صوتية.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر فتح المساعد");
    } finally {
      setBusy(false);
    }
  }

  async function sendTextMessage(message: string) {
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

  async function send(e: FormEvent) {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setText("");
    await sendTextMessage(message);
  }

  async function confirmVoiceTranscript() {
    const transcript = (pendingTranscript || "").trim();
    if (!transcript || busy) return;
    setBusy(true);
    setError("");
    setPendingTranscript(null);
    setPendingHint("");
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

  async function listenToReply(bubble: Bubble) {
    if (bubble.audioBase64 && bubble.audioMime) {
      playBase64(bubble.audioBase64, bubble.audioMime);
      return;
    }
    try {
      const token = getShopToken();
      if (!token) return;
      const result = await shopFetch<{
        audioBase64: string;
        mimeType: string;
      }>("/shop/assistant/tts", {
        method: "POST",
        body: JSON.stringify({ text: bubble.content }),
        timeoutMs: 60000,
      });
      setMessages((prev) =>
        prev.map((row) =>
          row.id === bubble.id
            ? { ...row, audioBase64: result.audioBase64, audioMime: result.mimeType }
            : row,
        ),
      );
      playBase64(result.audioBase64, result.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تشغيل الرد الصوتي");
    }
  }

  function playBase64(b64: string, mime: string) {
    const audio = new Audio(`data:${mime};base64,${b64}`);
    void audio.play();
  }

  return (
    <div className={`shop-assist ${open ? "open" : ""}`}>
      {!open ? (
        <button
          type="button"
          className="shop-assist-toggle"
          onClick={() => setOpen(true)}
        >
          مساعد السفر
        </button>
      ) : null}
      {open ? (
        <section className="shop-assist-panel">
          <header className="shop-assist-head">
            <strong>مساعد WeekendGate</strong>
            {!unlocked ? (
              <p className="shop-assist-head-hint">أدخل رقم جوالك للبدء</p>
            ) : null}
            <button
              type="button"
              className="shop-assist-close"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          {error ? <p className="shop-error">{error}</p> : null}
          {!unlocked ? (
            <form className="shop-assist-gate" onSubmit={unlock}>
              <label>
                الاسم
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك"
                />
              </label>
              <label>
                الجوال
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="965xxxxxxxx"
                  required
                />
              </label>
              <button className="shop-btn" type="submit" disabled={busy}>
                {busy ? "..." : "بدء المحادثة"}
              </button>
            </form>
          ) : (
            <div className="shop-assist-body">
              <div className="shop-assist-log">
                {messages.map((row) => (
                  <div key={row.id} className={`ta-msg ${row.role === "user" ? "out" : "in"}`}>
                    <div className={`ta-bubble ${row.role}`}>
                      <ChatOfferBody content={row.content} role={row.role} />
                      {row.role === "assistant" && row.id !== "welcome" ? (
                        <button
                          type="button"
                          className="shop-voice-listen"
                          onClick={() => void listenToReply(row)}
                        >
                          الاستماع للرد
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {busy ? <p className="shop-hint">جارٍ البحث والرد...</p> : null}
              </div>

              {pendingTranscript ? (
                <div className="shop-voice-confirm">
                  <strong>راجع النص قبل التنفيذ</strong>
                  {pendingHint ? <p className="shop-hint">{pendingHint}</p> : null}
                  <textarea
                    value={pendingTranscript}
                    onChange={(e) => setPendingTranscript(e.target.value)}
                    rows={3}
                  />
                  <div className="shop-voice-review-actions">
                    <button
                      type="button"
                      className="shop-btn"
                      disabled={busy}
                      onClick={() => void confirmVoiceTranscript()}
                    >
                      تأكيد وإرسال
                    </button>
                    <button
                      type="button"
                      className="shop-btn ghost"
                      onClick={() => {
                        setPendingTranscript(null);
                        setPendingHint("");
                      }}
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
                    const slots = meta.unclearSlots?.length
                      ? `يلزم توضيح: ${meta.unclearSlots.join("، ")}`
                      : "يبدو أن الرسالة تتضمن طلب بحث — أكّد النص قبل التنفيذ.";
                    setPendingHint(slots);
                    setPendingTranscript(transcript);
                    return;
                  }
                  void (async () => {
                    setPendingTranscript(null);
                    await sendTextMessage(transcript);
                  })();
                }}
              />

              <form className="shop-assist-form" onSubmit={send}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="اكتب وجهتك وتواريخ السفر"
                />
                <button className="shop-btn" type="submit" disabled={busy || !text.trim()}>
                  إرسال
                </button>
              </form>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
