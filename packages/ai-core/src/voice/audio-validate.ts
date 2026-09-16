import {
  VOICE_ALLOWED_EXTENSIONS,
  VOICE_ALLOWED_MIME,
  VOICE_MAX_BYTES,
} from "./constants";

export type DetectedAudioFormat =
  | "mp3"
  | "wav"
  | "ogg"
  | "webm"
  | "m4a"
  | "unknown";

export type AudioValidationResult =
  | {
      ok: true;
      format: Exclude<DetectedAudioFormat, "unknown">;
      mime: string;
      size: number;
    }
  | { ok: false; errorCode: string; messageAr: string };

function hasPrefix(buf: Buffer, bytes: number[]): boolean {
  if (buf.length < bytes.length) return false;
  return bytes.every((b, i) => buf[i] === b);
}

/** Detect container from magic bytes — do not trust extension alone. */
export function detectAudioFormat(buf: Buffer): DetectedAudioFormat {
  if (buf.length < 12) return "unknown";
  // OGG
  if (hasPrefix(buf, [0x4f, 0x67, 0x67, 0x53])) return "ogg";
  // WAV RIFF....WAVE
  if (
    hasPrefix(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf.slice(8, 12).toString("ascii") === "WAVE"
  ) {
    return "wav";
  }
  // WebM / Matroska EBML
  if (hasPrefix(buf, [0x1a, 0x45, 0xdf, 0xa3])) return "webm";
  // MP3 ID3 or frame sync
  if (hasPrefix(buf, [0x49, 0x44, 0x33])) return "mp3";
  if (buf[0] === 0xff && (buf[1]! & 0xe0) === 0xe0) return "mp3";
  // MP4/M4A ftyp
  const ftyp = buf.slice(4, 8).toString("ascii");
  if (ftyp === "ftyp") {
    const brand = buf.slice(8, 12).toString("ascii");
    if (/M4A|mp42|isom|iso2|mp41/i.test(brand) || brand.startsWith("M4")) {
      return "m4a";
    }
    // treat other ftyp audio-ish as m4a for whisper
    return "m4a";
  }
  return "unknown";
}

export function extensionForFormat(format: DetectedAudioFormat): string {
  switch (format) {
    case "mp3":
      return ".mp3";
    case "wav":
      return ".wav";
    case "ogg":
      return ".ogg";
    case "webm":
      return ".webm";
    case "m4a":
      return ".m4a";
    default:
      return ".bin";
  }
}

export function mimeForFormat(format: DetectedAudioFormat): string {
  switch (format) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "webm":
      return "audio/webm";
    case "m4a":
      return "audio/mp4";
    default:
      return "application/octet-stream";
  }
}

export function validateAudioBuffer(
  buf: Buffer,
  claimedMime?: string,
  claimedName?: string,
): AudioValidationResult {
  if (!buf?.length) {
    return {
      ok: false,
      errorCode: "EMPTY",
      messageAr: "الملف الصوتي فارغ",
    };
  }
  if (buf.length > VOICE_MAX_BYTES) {
    return {
      ok: false,
      errorCode: "TOO_LARGE",
      messageAr: `حجم الملف يتجاوز الحد الآمن (${Math.round(VOICE_MAX_BYTES / (1024 * 1024))} ميجابايت)`,
    };
  }

  const format = detectAudioFormat(buf);
  if (format === "unknown") {
    return {
      ok: false,
      errorCode: "UNSUPPORTED",
      messageAr: "صيغة الصوت غير مدعومة. استخدم mp3 أو m4a أو wav أو ogg أو webm.",
    };
  }

  const mime = (claimedMime || "").toLowerCase();
  const ext = (claimedName || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  if (mime && !(VOICE_ALLOWED_MIME as readonly string[]).includes(mime)) {
    // Allow mismatch if magic bytes are valid (MediaRecorder quirks)
    if (!mime.startsWith("audio/") && mime !== "video/webm" && mime !== "application/octet-stream") {
      return {
        ok: false,
        errorCode: "MIME",
        messageAr: "نوع الملف غير مسموح",
      };
    }
  }
  if (ext && !(VOICE_ALLOWED_EXTENSIONS as readonly string[]).includes(ext as never)) {
    // still ok if magic bytes matched
  }

  return {
    ok: true,
    format,
    mime: mimeForFormat(format),
    size: buf.length,
  };
}

/** Heuristic: very short / near-silent buffers → unclear. */
export function looksUnclearAudio(buf: Buffer, durationSec?: number): boolean {
  if (durationSec != null && durationSec < 0.5) return true;
  if (buf.length < 1200) return true;
  // Sample RMS-ish on a slice for wav/pcm-ish; for compressed formats use size/duration
  if (durationSec != null && durationSec > 0 && buf.length / durationSec < 400) {
    return true;
  }
  return false;
}
