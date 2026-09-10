import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";
import {
  VOICE_STT_MODEL,
  VOICE_STT_PROMPT_AR,
  estimateVoiceCostUsd,
} from "./constants";
import {
  extensionForFormat,
  type DetectedAudioFormat,
  validateAudioBuffer,
  looksUnclearAudio,
} from "./audio-validate";

export type SpeechToTextResult = {
  text: string;
  language?: string;
  durationSec?: number;
  unclear: boolean;
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
 * OpenAI Whisper STT — server-side only.
 * Do not log transcript content (may contain PII).
 */
export async function transcribeAudio(input: {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
  durationSec?: number;
  language?: string;
}): Promise<SpeechToTextResult> {
  const validated = validateAudioBuffer(input.buffer, input.mimeType, input.filename);
  if (!validated.ok) {
    const err = new Error(validated.messageAr);
    (err as Error & { code?: string }).code = validated.errorCode;
    throw err;
  }

  if (looksUnclearAudio(input.buffer, input.durationSec)) {
    return {
      text: "",
      unclear: true,
      durationSec: input.durationSec,
      estimatedCostUsd: estimateVoiceCostUsd(input.durationSec || 1),
      model: VOICE_STT_MODEL,
    };
  }

  const { apiKey, baseUrl } = openaiConfig();
  if (!apiKey) {
    const mockText = mockTranscriptFromBuffer(input.buffer);
    return {
      text: mockText,
      language: "ar",
      durationSec: input.durationSec,
      unclear: !mockText,
      estimatedCostUsd: 0,
      model: "mock-stt",
    };
  }

  const format = validated.format as DetectedAudioFormat;
  const ext = extensionForFormat(format);
  const tmpPath = join(tmpdir(), `wg-stt-${randomUUID()}${ext}`);
  await writeFile(tmpPath, input.buffer);

  try {
    const form = new FormData();
    const bytes = new Uint8Array(input.buffer);
    const blob = new Blob([bytes], { type: validated.mime });
    form.append("file", blob, `audio${ext}`);
    form.append("model", VOICE_STT_MODEL);
    form.append("prompt", VOICE_STT_PROMPT_AR);
    form.append("response_format", "verbose_json");
    if (input.language) form.append("language", input.language);

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as {
      text?: string;
      language?: string;
      duration?: number;
      error?: { message?: string };
    };
    if (!res.ok) {
      const err = new Error("تعذر تحويل الصوت إلى نص");
      (err as Error & { code?: string }).code = "STT_FAILED";
      throw err;
    }
    const text = String(json.text || "").trim();
    const durationSec = Number(json.duration || input.durationSec || 0) || undefined;
    const unclear = !text || text.length < 2;
    return {
      text,
      language: json.language,
      durationSec,
      unclear,
      estimatedCostUsd: estimateVoiceCostUsd(durationSec || 1),
      model: VOICE_STT_MODEL,
    };
  } finally {
    await unlink(tmpPath).catch(() => undefined);
  }
}

function mockTranscriptFromBuffer(buf: Buffer): string {
  const marker = Buffer.from("WGSTT:");
  const idx = buf.indexOf(marker);
  if (idx >= 0) {
    return buf.slice(idx + marker.length).toString("utf8").trim();
  }
  return "";
}
