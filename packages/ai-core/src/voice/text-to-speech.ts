import { VOICE_TTS_MODEL, VOICE_TTS_VOICE, estimateVoiceCostUsd } from "./constants";

export type TextToSpeechResult = {
  audioBase64: string;
  mimeType: string;
  estimatedCostUsd: number;
  model: string;
};

function openaiConfig() {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || "";
  const baseUrl = (
    process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  return { apiKey, baseUrl };
}

/**
 * Optional TTS for assistant replies. Server-side only.
 * Do not log the text content.
 */
export async function synthesizeSpeech(input: {
  text: string;
  voice?: string;
}): Promise<TextToSpeechResult> {
  const text = String(input.text || "").trim().slice(0, 4000);
  if (!text) {
    throw Object.assign(new Error("لا يوجد نص للتحويل إلى صوت"), { code: "EMPTY_TEXT" });
  }

  const { apiKey, baseUrl } = openaiConfig();
  if (!apiKey) {
    // Silent mock wav header + marker for tests
    const payload = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.alloc(4),
      Buffer.from("WAVEfmt "),
      Buffer.from("WGTTS:"),
      Buffer.from(text.slice(0, 40), "utf8"),
    ]);
    return {
      audioBase64: payload.toString("base64"),
      mimeType: "audio/wav",
      estimatedCostUsd: 0,
      model: "mock-tts",
    };
  }

  const res = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VOICE_TTS_MODEL,
      voice: input.voice || VOICE_TTS_VOICE,
      input: text,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    throw Object.assign(new Error("تعذر إنشاء الرد الصوتي"), { code: "TTS_FAILED" });
  }
  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  const approxSec = Math.max(2, Math.ceil(text.length / 12));
  return {
    audioBase64: buf.toString("base64"),
    mimeType: "audio/mpeg",
    estimatedCostUsd: estimateVoiceCostUsd(approxSec, true),
    model: VOICE_TTS_MODEL,
  };
}
