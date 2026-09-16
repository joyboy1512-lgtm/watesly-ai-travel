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
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

type Bubble = {
  id: string;
  role: "user" | "assistant";
  content: string;
  audioBase64?: string;
  audioMime?: string;
};

export function ShopAssistant() {
  const { t, locale } = useShopI18n();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [needsUnlockCode, setNeedsUnlockCode] = useState(false);
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
            content: t("assistantWelcome"),
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
            content: t("assistantWelcomeBack"),
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

  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("wg-open-assistant", onOpen);
    return () => window.removeEventListener("wg-open-assistant", onOpen);
  }, []);

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
        setMessages([
          {
            id: "welcome-unlocked",
            role: "assistant",
            content: t("assistantUnlocked"),
          },
        ]);
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
    <div className={`shop-assist wg-float-support wg-wa-assist ${open ? "open" : ""}`}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
.wg-float-actions,
.shop-assist-toggle {
  display: none !important;
}
.wg-hero-ai-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.42rem !important;
  margin-inline-start: 0.35rem !important;
  border: 0 !important;
  background: rgba(255,255,255,0.18) !important;
  color: #fff !important;
  -webkit-text-fill-color: #fff !important;
  font: inherit !important;
  font-weight: 800 !important;
  font-size: 0.98rem !important;
  padding: 0.42rem 0.85rem !important;
  border-radius: 999px !important;
  cursor: pointer !important;
  white-space: nowrap !important;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28) !important;
}
.wg-hero-ai-btn svg { flex: 0 0 auto; }
.wg-hero-ai-btn:hover { background: rgba(255,255,255,0.28) !important; }
.shop-assist.wg-wa-assist {
  position: fixed !important;
  inset-inline-start: 1rem !important;
  inset-inline-end: auto !important;
  bottom: 1rem !important;
  z-index: 80 !important;
  justify-items: start !important;
}
.shop-assist.wg-wa-assist .shop-assist-panel {
  width: min(380px, calc(100vw - 1.5rem)) !important;
  min-height: 520px !important;
  max-height: min(640px, calc(100vh - 5.5rem)) !important;
  border: 0 !important;
  border-radius: 18px !important;
  overflow: hidden !important;
  box-shadow: 0 18px 48px rgba(11, 20, 32, 0.32) !important;
  background: #efeae2 !important;
}
.shop-assist.wg-wa-assist .shop-assist-head {
  background: #008069 !important;
  color: #fff !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 0.65rem !important;
  padding: 0.7rem 2.6rem 0.7rem 0.8rem !important;
}
.shop-assist.wg-wa-assist .wg-wa-avatar {
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.18);
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.shop-assist.wg-wa-assist .shop-assist-head strong {
  font-size: 1rem !important;
}
.shop-assist.wg-wa-assist .shop-assist-log {
  background: #e5ddd5 !important;
}
.shop-assist.wg-wa-assist .ta-msg.in .ta-bubble {
  background: #fff !important;
  color: #111b21 !important;
  border-radius: 0 10px 10px 10px !important;
}
.shop-assist.wg-wa-assist .ta-msg.out .ta-bubble {
  background: #d9fdd3 !important;
  color: #111b21 !important;
  -webkit-text-fill-color: #111b21 !important;
  border-radius: 10px 0 10px 10px !important;
}
.shop-assist.wg-wa-assist .shop-assist-form {
  background: #f0f2f5 !important;
}
.shop-assist.wg-wa-assist .shop-assist-form textarea {
  border-radius: 22px !important;
  background: #fff !important;
}
.shop-assist.wg-wa-assist .shop-assist-form .shop-btn {
  background: #008069 !important;
  color: #fff !important;
  border-radius: 999px !important;
}
@media (max-width: 720px) {
  .wg-hero-ai-btn span { display: none !important; }
  .wg-hero-ai-btn { padding: 0.4rem !important; }
}
`,
        }}
      />
      {open ? (
        <section className="shop-assist-panel" role="dialog" aria-label={t("aiAssistant")}>
          <header className="shop-assist-head">
            <span className="wg-wa-avatar" aria-hidden>
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M12 2.2 13.4 8l5.6 1.4L13.4 10.8 12 16.6 10.6 10.8 5 9.4 10.6 8 12 2.2zm7.2 11.3.8 3.1 3.1.8-3.1.8-.8 3.1-.8-3.1-3.1-.8 3.1-.8.8-3.1zM4.8 13.4l.7 2.4 2.4.6-2.4.6-.7 2.4-.6-2.4-2.4-.6 2.4-.6.6-2.4z"
                />
              </svg>
            </span>
            <div>
              <strong>{t("aiAssistant")}</strong>
              {!unlocked ? (
                <p className="shop-assist-head-hint">{t("assistantGateHint")}</p>
              ) : (
                <p className="shop-assist-head-hint">{locale === "en" ? "Online" : "متصل"}</p>
              )}
            </div>
            <button
              type="button"
              className="shop-assist-close"
              aria-label={t("close")}
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>
          {error ? <p className="shop-error">{error}</p> : null}
          {!unlocked ? (
            <form className="shop-assist-gate" onSubmit={unlock}>
              <label>
                {t("name")}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("name")}
                />
              </label>
              <label>
                {t("mobile")}
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="965xxxxxxxx"
                  required
                  disabled={needsUnlockCode}
                />
              </label>
              {needsUnlockCode ? (
                <label>
                  {t("otpCode")}
                  <input
                    value={unlockCode}
                    onChange={(e) => setUnlockCode(e.target.value)}
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder={t("otpPlaceholder")}
                  />
                </label>
              ) : null}
              <button className="shop-btn" type="submit" disabled={busy}>
                {busy ? "..." : needsUnlockCode ? t("confirmCode") : t("aiAssistant")}
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
                          {t("assistantListen")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {busy ? <p className="shop-hint">{t("assistantBusy")}</p> : null}
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
                  placeholder={t("assistantPlaceholder")}
                />
                <button className="shop-btn" type="submit" disabled={busy || !text.trim()}>
                  {t("assistantSend")}
                </button>
              </form>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
