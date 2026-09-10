/** Voice message limits and STT prompt hints (Kuwaiti/Egyptian + travel terms). */

export const VOICE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const VOICE_MAX_DURATION_SEC = 60;
export const VOICE_MIN_DURATION_SEC = 0.4;

export const VOICE_ALLOWED_EXTENSIONS = [
  ".mp3",
  ".m4a",
  ".wav",
  ".ogg",
  ".opus",
  ".webm",
] as const;

export const VOICE_ALLOWED_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "video/webm", // browsers often tag MediaRecorder webm as video/webm
] as const;

/** Whisper prompt: bias toward Arabic travel vocabulary (not user PII). */
export const VOICE_STT_PROMPT_AR = [
  "محادثة حجز سفر بالكويت. كلمات شائعة:",
  "دبي أبوظبي الشارقة الرياض جدة القاهرة إسطنبول بيروت الدوحة البحرين مسقط",
  "مطار الكويت KWI DXB AUH CAI IST JED RUH DOH BAH",
  "طيران الإمارات الاتحاد القطرية الكويتية السعودية فلاي دبي العربية للطيران",
  "ذهاب عودة فندق غرفة بالغين أطفال ليلة إفطار",
  "لهجة كويتية ومصرية مقبولة.",
].join(" ");

export const VOICE_STT_MODEL = process.env.OPENAI_STT_MODEL?.trim() || "whisper-1";
export const VOICE_TTS_MODEL = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
export const VOICE_TTS_VOICE = process.env.OPENAI_TTS_VOICE?.trim() || "alloy";

/** Approx OpenAI list prices (USD) — update when pricing changes. */
export const VOICE_COST_USD = {
  /** Whisper ~$0.006 / minute */
  sttPerMinute: 0.006,
  /** gpt-4o-mini-tts ~$0.015 / minute of audio output (approx) */
  ttsPerMinute: 0.015,
} as const;

export function estimateVoiceCostUsd(durationSec: number, withTts = false): number {
  const minutes = Math.max(durationSec, 1) / 60;
  const stt = minutes * VOICE_COST_USD.sttPerMinute;
  const tts = withTts ? minutes * VOICE_COST_USD.ttsPerMinute : 0;
  return Number((stt + tts).toFixed(5));
}
