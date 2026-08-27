/**
 * Voice pipeline (reusable web + WhatsApp):
 * Voice Message → Media Download → STT → (confirm) → AssistantService → optional TTS
 *
 * This module stops at transcript + review. Calling AssistantService stays in the API layer
 * so chat logic is never duplicated.
 */

import {
  resolveVoiceMediaAdapter,
  type VoiceMediaSource,
  type DownloadedVoiceMedia,
} from "./media-download";
import { validateAudioBuffer, looksUnclearAudio } from "./audio-validate";
import { VOICE_MAX_DURATION_SEC } from "./constants";
import { transcribeAudio, type SpeechToTextResult } from "./speech-to-text";
import { reviewTranscript, type TranscriptReview } from "./transcript-review";
import { synthesizeSpeech, type TextToSpeechResult } from "./text-to-speech";

export type VoicePipelineInput = {
  source: VoiceMediaSource;
  language?: string;
};

export type VoicePipelineResult = {
  media: DownloadedVoiceMedia;
  stt: SpeechToTextResult;
  review: TranscriptReview;
  status:
    | "understood"
    | "needs_confirm"
    | "unclear"
    | "failed";
  messageAr: string;
};

export async function runVoiceToTranscript(
  input: VoicePipelineInput,
): Promise<VoicePipelineResult> {
  const adapter = resolveVoiceMediaAdapter(input.source.kind);
  let media: DownloadedVoiceMedia;
  try {
    media = await adapter.download(input.source);
  } catch {
    return fail("تعذر معالجة التسجيل", "failed");
  }

  if (
    media.durationSec != null &&
    media.durationSec > VOICE_MAX_DURATION_SEC
  ) {
    return fail(
      `مدة التسجيل تتجاوز ${VOICE_MAX_DURATION_SEC} ثانية`,
      "failed",
    );
  }

  const validated = validateAudioBuffer(
    media.buffer,
    media.mimeType,
    media.filename,
  );
  if (!validated.ok) {
    return {
      media,
      stt: {
        text: "",
        unclear: true,
        estimatedCostUsd: 0,
        model: "none",
      },
      review: reviewTranscript("", true),
      status: "failed",
      messageAr: validated.messageAr,
    };
  }

  try {
    const stt = await transcribeAudio({
      buffer: media.buffer,
      filename: media.filename,
      mimeType: validated.mime,
      durationSec: media.durationSec,
      language: input.language,
    });

    if (stt.unclear || looksUnclearAudio(media.buffer, media.durationSec)) {
      return {
        media,
        stt,
        review: reviewTranscript(stt.text, true),
        status: "unclear",
        messageAr: "الصوت غير واضح، حاول مرة أخرى",
      };
    }

    const review = reviewTranscript(stt.text, false);
    if (review.needsConfirm) {
      return {
        media,
        stt,
        review,
        status: "needs_confirm",
        messageAr: "تم فهم الرسالة — راجع النص قبل التنفيذ",
      };
    }

    return {
      media,
      stt,
      review,
      status: "understood",
      messageAr: "تم فهم الرسالة",
    };
  } catch {
    return fail("تعذر معالجة التسجيل", "failed");
  }
}

function fail(
  messageAr: string,
  status: VoicePipelineResult["status"],
): VoicePipelineResult {
  return {
    media: {
      buffer: Buffer.alloc(0),
      source: "upload",
    },
    stt: { text: "", unclear: true, estimatedCostUsd: 0, model: "none" },
    review: reviewTranscript("", true),
    status,
    messageAr,
  };
}

export async function optionalReplySpeech(
  text: string,
): Promise<TextToSpeechResult> {
  return synthesizeSpeech({ text });
}

export type { SpeechToTextResult, TextToSpeechResult, TranscriptReview };
