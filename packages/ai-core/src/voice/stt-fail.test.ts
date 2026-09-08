import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { transcribeAudio } from "./speech-to-text";

function wavWithMarker(text: string): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + 4000, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  return Buffer.concat([header, Buffer.from(`WGSTT:${text}`), Buffer.alloc(4000)]);
}

describe("speech-to-text failures", () => {
  it("rejects unsupported buffer", async () => {
    await assert.rejects(
      () =>
        transcribeAudio({
          buffer: Buffer.from("not-an-audio-file!!!!"),
          filename: "x.txt",
        }),
      (err: unknown) =>
        err instanceof Error && (err as Error & { code?: string }).code === "UNSUPPORTED",
    );
  });

  it("returns unclear for tiny wav", async () => {
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.write("WAVE", 8);
    const result = await transcribeAudio({
      buffer: header,
      filename: "t.wav",
      durationSec: 0.2,
    });
    assert.equal(result.unclear, true);
  });

  it("mock arabic transcript without API key", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await transcribeAudio({
      buffer: wavWithMarker("حجز فندق في القاهرة"),
      filename: "ar.wav",
      durationSec: 2,
    });
    assert.match(result.text, /القاهرة/);
    assert.equal(result.unclear, false);
  });
});
