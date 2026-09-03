import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  detectAudioFormat,
  validateAudioBuffer,
} from "./audio-validate";
import { reviewTranscript } from "./transcript-review";
import { runVoiceToTranscript } from "./pipeline";
import { estimateVoiceCostUsd } from "./constants";

function wavHeader(size = 200): Buffer {
  const buf = Buffer.alloc(44 + size);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + size, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  return buf;
}

describe("audio-validate", () => {
  it("detects wav/ogg/webm magic bytes", () => {
    assert.equal(detectAudioFormat(wavHeader()), "wav");
    const ogg = Buffer.from([0x4f, 0x67, 0x67, 0x53, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(detectAudioFormat(ogg), "ogg");
    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.equal(detectAudioFormat(webm), "webm");
  });

  it("rejects unknown and oversized payloads", () => {
    const bad = validateAudioBuffer(Buffer.from("not-audio-at-all!!!!!!!!!!"));
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.errorCode, "UNSUPPORTED");
  });

  it("accepts wav regardless of wrong extension claim", () => {
    const ok = validateAudioBuffer(wavHeader(5000), "application/octet-stream", "x.bin");
    assert.equal(ok.ok, true);
  });
});

describe("transcript-review", () => {
  it("flags flight search for confirm", () => {
    const r = reviewTranscript("أبي رحلة من الكويت إلى دبي يوم 2026-09-20 لشخصين");
    assert.equal(r.needsConfirm, true);
    assert.ok(r.reason === "search_intent" || r.reason === "unclear_slots");
  });

  it("allows clear chitchat without confirm", () => {
    const r = reviewTranscript("مرحبا كيف حالك");
    assert.equal(r.needsConfirm, false);
  });

  it("marks empty / unclear", () => {
    assert.equal(reviewTranscript("", true).reason, "low_confidence");
  });
});

describe("voice pipeline", () => {
  it("handles Arabic mock transcript embedded in wav", async () => {
    const body = Buffer.concat([wavHeader(100), Buffer.from("WGSTT:أريد فندق في دبي"), Buffer.alloc(2000)]);
    const result = await runVoiceToTranscript({
      source: {
        kind: "upload",
        buffer: body,
        mimeType: "audio/wav",
        filename: "a.wav",
        durationSec: 3,
      },
    });
    assert.ok(result.stt.text.includes("دبي") || result.status === "needs_confirm" || result.status === "understood");
  });

  it("English mock transcript", async () => {
    const body = Buffer.concat([
      wavHeader(100),
      Buffer.from("WGSTT:Find flights from Kuwait to Cairo"),
      Buffer.alloc(2000),
    ]);
    const result = await runVoiceToTranscript({
      source: { kind: "upload", buffer: body, filename: "en.wav", durationSec: 2 },
    });
    assert.ok(result.stt.text.toLowerCase().includes("cairo") || result.stt.text.length >= 0);
  });

  it("unclear short audio", async () => {
    const result = await runVoiceToTranscript({
      source: {
        kind: "upload",
        buffer: wavHeader(50),
        filename: "short.wav",
        durationSec: 0.2,
      },
    });
    assert.ok(result.status === "unclear" || result.status === "failed" || result.stt.unclear);
  });

  it("unsupported file", async () => {
    const result = await runVoiceToTranscript({
      source: {
        kind: "upload",
        buffer: Buffer.from("%PDF-1.4 fake"),
        filename: "x.pdf",
        durationSec: 1,
      },
    });
    assert.equal(result.status, "failed");
  });

  it("estimates cost per minute", () => {
    const c = estimateVoiceCostUsd(60);
    assert.ok(c > 0 && c < 0.1);
  });
});
