import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from "@nestjs/common";
import {
  VOICE_MAX_BYTES,
  VOICE_MAX_DURATION_SEC,
  optionalReplySpeech,
  runVoiceToTranscript,
  estimateVoiceCostUsd,
} from "@watesly-travel/ai-core";
import { rateLimitOrThrow } from "@watesly-travel/shared";
import { AssistantService } from "./assistant.service";

@Injectable()
export class VoiceAssistantService {
  constructor(private readonly assistant: AssistantService) {}

  /**
   * Transcribe only — never call AssistantService until client confirms when needed.
   * Audio bytes are not persisted.
   */
  async transcribeUpload(input: {
    organizationId: string;
    customerKey: string;
    buffer: Buffer;
    filename?: string;
    mimeType?: string;
    durationSec?: number;
  }) {
    try {
      rateLimitOrThrow(`voice:${input.organizationId}:${input.customerKey}`, 20, 60_000);
    } catch {
      throw new BadRequestException("طلبات صوتية كثيرة. انتظر قليلاً ثم أعد المحاولة.");
    }

    if (!input.buffer?.length) {
      throw new BadRequestException("لا يوجد تسجيل صوتي");
    }
    if (input.buffer.length > VOICE_MAX_BYTES) {
      throw new PayloadTooLargeException("حجم الملف الصوتي كبير جداً");
    }
    if (
      input.durationSec != null &&
      input.durationSec > VOICE_MAX_DURATION_SEC
    ) {
      throw new BadRequestException(
        `الحد الأقصى لمدة التسجيل ${VOICE_MAX_DURATION_SEC} ثانية`,
      );
    }

    // Structured ops log — no transcript / no raw audio
    const started = Date.now();
    const result = await runVoiceToTranscript({
      source: {
        kind: "upload",
        buffer: input.buffer,
        filename: input.filename,
        mimeType: input.mimeType,
        durationSec: input.durationSec,
      },
      language: "ar",
    });

    console.info(
      JSON.stringify({
        kind: "voice_ops",
        operation: "transcribe",
        org: input.organizationId,
        status: result.status,
        durationMs: Date.now() - started,
        bytes: input.buffer.length,
        sttModel: result.stt.model,
        costUsd: result.stt.estimatedCostUsd,
        // never: transcript, phone, email
      }),
    );

    if (result.status === "failed") {
      throw new BadRequestException(result.messageAr || "تعذر معالجة التسجيل");
    }
    if (result.status === "unclear") {
      return {
        status: "unclear" as const,
        messageAr: result.messageAr,
        transcript: "",
        needsConfirm: true,
        unclearSlots: result.review.unclearSlots,
        estimatedCostUsd: result.stt.estimatedCostUsd,
      };
    }

    return {
      status: result.status,
      messageAr: result.messageAr,
      transcript: result.stt.text,
      needsConfirm: result.review.needsConfirm,
      reviewReason: result.review.reason,
      unclearSlots: result.review.unclearSlots,
      estimatedCostUsd: result.stt.estimatedCostUsd,
      language: result.stt.language,
    };
  }

  /** After confirm: same AssistantService.chat path as text. */
  async chatFromTranscript(input: {
    organizationId: string;
    userId?: string;
    channel: "web_chat" | "whatsapp" | "dashboard" | "telegram" | "other";
    text: string;
    contactId?: string;
    conversationId?: string;
    externalRef?: string;
    threadId?: string;
  }) {
    const text = String(input.text || "").trim();
    if (!text) throw new BadRequestException("النص المستخرج فارغ");
    return this.assistant.chat({
      organizationId: input.organizationId,
      userId: input.userId,
      channel: input.channel,
      text,
      contactId: input.contactId,
      conversationId: input.conversationId,
      externalRef: input.externalRef,
      threadId: input.threadId,
    });
  }

  async synthesizeReply(text: string) {
    const clean = String(text || "").trim();
    if (!clean) throw new BadRequestException("لا يوجد نص");
    const audio = await optionalReplySpeech(clean);
    console.info(
      JSON.stringify({
        kind: "voice_ops",
        operation: "tts",
        status: "ok",
        costUsd: audio.estimatedCostUsd || estimateVoiceCostUsd(2, true),
        model: audio.model,
      }),
    );
    return audio;
  }
}
