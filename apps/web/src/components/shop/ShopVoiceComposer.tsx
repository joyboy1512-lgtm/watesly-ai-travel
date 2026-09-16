"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getShopToken } from "@/lib/shop-session";

export type VoiceUiStatus =
  | "idle"
  | "recording"
  | "review"
  | "uploading"
  | "transcribing"
  | "understood"
  | "unclear"
  | "failed";

type TranscribeResponse = {
  status: "understood" | "needs_confirm" | "unclear" | "failed";
  messageAr: string;
  transcript: string;
  needsConfirm: boolean;
  unclearSlots?: string[];
  estimatedCostUsd?: number;
};

type Props = {
  disabled?: boolean;
  onTranscriptReady: (transcript: string, meta: TranscribeResponse) => void;
  onError: (message: string) => void;
};

const MAX_MS = 60_000;
const API_BASE = () => {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "weekendgate.com" || host.endsWith(".weekendgate.com")) {
      return "https://api.weekendgate.com";
    }
  }
  return "/api";
};

export function ShopVoiceComposer({ disabled, onTranscriptReady, onError }: Props) {
  const [status, setStatus] = useState<VoiceUiStatus>("idle");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    tickRef.current = null;
    stopTimerRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      mediaRef.current?.stop();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [clearTimers, objectUrl]);

  function statusLabel(): string {
    switch (status) {
      case "recording":
        return "جاري التسجيل…";
      case "uploading":
        return "جاري رفع الرسالة…";
      case "transcribing":
        return "جاري تحويل الصوت…";
      case "understood":
        return "تم فهم الرسالة";
      case "unclear":
        return "الصوت غير واضح، حاول مرة أخرى";
      case "failed":
        return "تعذر معالجة التسجيل";
      case "review":
        return "راجع التسجيل قبل الإرسال";
      default:
        return "";
    }
  }

  async function startRecording() {
    if (disabled || status === "recording") return;
    setBlob(null);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setElapsedMs(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearTimers();
        const type = recorder.mimeType || "audio/webm";
        const b = new Blob(chunksRef.current, { type });
        setBlob(b);
        setObjectUrl(URL.createObjectURL(b));
        setStatus("review");
      };
      mediaRef.current = recorder;
      startedAtRef.current = Date.now();
      recorder.start(250);
      setStatus("recording");
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 200);
      stopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_MS);
    } catch {
      onError("تعذر الوصول إلى الميكروفون");
      setStatus("failed");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
  }

  function discard() {
    clearTimers();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setBlob(null);
    setElapsedMs(0);
    setStatus("idle");
  }

  async function onFilePick(file: File | null) {
    if (!file) return;
    setBlob(file);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(URL.createObjectURL(file));
    setStatus("review");
  }

  async function sendAudio() {
    if (!blob || disabled) return;
    const token = getShopToken();
    if (!token) {
      onError("سجّل الدخول للمساعد أولاً");
      return;
    }
    setStatus("uploading");
    try {
      const form = new FormData();
      const ext = blob.type.includes("ogg")
        ? "ogg"
        : blob.type.includes("mp4") || blob.type.includes("m4a")
          ? "m4a"
          : blob.type.includes("wav")
            ? "wav"
            : blob.type.includes("mpeg")
              ? "mp3"
              : "webm";
      form.append("audio", blob, `voice.${ext}`);
      form.append("durationSec", String(Math.max(1, Math.round(elapsedMs / 1000)) || 3));
      setStatus("transcribing");
      const res = await fetch(`${API_BASE()}/shop/assistant/voice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as TranscribeResponse & {
        message?: string;
      };
      if (!res.ok) {
        setStatus(res.status === 413 ? "failed" : "failed");
        onError(data.message || data.messageAr || "تعذر معالجة التسجيل");
        return;
      }
      if (data.status === "unclear") {
        setStatus("unclear");
        onError(data.messageAr || "الصوت غير واضح، حاول مرة أخرى");
        return;
      }
      setStatus("understood");
      onTranscriptReady(data.transcript || "", data);
      discard();
    } catch {
      setStatus("failed");
      onError("تعذر معالجة التسجيل");
    }
  }

  const seconds = Math.min(60, Math.floor(elapsedMs / 1000));

  return (
    <div className="shop-voice" aria-live="polite">
      {statusLabel() ? <p className="shop-voice-status">{statusLabel()}</p> : null}
      <div className="shop-voice-actions">
        {status !== "recording" ? (
          <button
            type="button"
            className="shop-voice-btn"
            disabled={disabled || status === "uploading" || status === "transcribing"}
            onClick={() => void startRecording()}
          >
            تسجيل صوتي
          </button>
        ) : (
          <button type="button" className="shop-voice-btn danger" onClick={stopRecording}>
            إيقاف ({seconds}ث / 60)
          </button>
        )}
        <label className="shop-voice-btn ghost">
          رفع ملف
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.opus"
            hidden
            disabled={disabled || status === "recording"}
            onChange={(e) => void onFilePick(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      {status === "review" && blob ? (
        <div className="shop-voice-review">
          {objectUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={objectUrl} />
          ) : null}
          <div className="shop-voice-review-actions">
            <button type="button" className="shop-btn" onClick={() => void sendAudio()}>
              إرسال الصوت
            </button>
            <button type="button" className="shop-btn ghost" onClick={discard}>
              حذف
            </button>
          </div>
          <p className="shop-hint">
            لا نحتفظ بالتسجيلات بشكل دائم. بعد التحويل إلى نص يُحذف الملف من المعالجة.
          </p>
        </div>
      ) : null}
    </div>
  );
}
