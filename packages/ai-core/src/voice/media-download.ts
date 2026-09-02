/**
 * Media download adapter — web uploads implement this; WhatsApp will fetch Graph media.
 * Never exposes OpenAI keys. Callers pass bytes only.
 */

export type VoiceMediaSource =
  | { kind: "upload"; buffer: Buffer; filename?: string; mimeType?: string; durationSec?: number }
  | { kind: "whatsapp"; mediaId: string; mimeType?: string; durationSec?: number }
  | { kind: "url"; url: string; mimeType?: string; durationSec?: number };

export type DownloadedVoiceMedia = {
  buffer: Buffer;
  filename?: string;
  mimeType?: string;
  durationSec?: number;
  source: VoiceMediaSource["kind"];
};

export interface VoiceMediaDownloadAdapter {
  download(source: VoiceMediaSource): Promise<DownloadedVoiceMedia>;
}

/** Web / direct buffer path. */
export class UploadVoiceMediaAdapter implements VoiceMediaDownloadAdapter {
  async download(source: VoiceMediaSource): Promise<DownloadedVoiceMedia> {
    if (source.kind !== "upload") {
      throw new Error("UploadVoiceMediaAdapter يدعم مصدر upload فقط");
    }
    return {
      buffer: source.buffer,
      filename: source.filename,
      mimeType: source.mimeType,
      durationSec: source.durationSec,
      source: "upload",
    };
  }
}

/**
 * Placeholder for WhatsApp Cloud API media download.
 * Wire Graph GET /{mediaId} → CDN URL → bytes when WA voice is enabled.
 */
export class WhatsAppVoiceMediaAdapter implements VoiceMediaDownloadAdapter {
  async download(source: VoiceMediaSource): Promise<DownloadedVoiceMedia> {
    if (source.kind !== "whatsapp") {
      throw new Error("WhatsAppVoiceMediaAdapter يدعم مصدر whatsapp فقط");
    }
    throw new Error(
      "تحميل وسائط واتساب غير مفعّل بعد — أضف WHATSAPP_TOKEN وربط Graph media download.",
    );
  }
}

export function resolveVoiceMediaAdapter(
  kind: VoiceMediaSource["kind"],
): VoiceMediaDownloadAdapter {
  if (kind === "whatsapp") return new WhatsAppVoiceMediaAdapter();
  return new UploadVoiceMediaAdapter();
}
