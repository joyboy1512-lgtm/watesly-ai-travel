# Assistant voice messages

## Pipeline
Voice Message → Media Download Adapter → Speech-to-Text → (optional confirm) → AssistantService → Travel Tools → Text → Optional TTS

## Endpoints (shop, customer JWT)
- `POST /shop/assistant/voice` multipart field `audio` (+ optional `durationSec`)
- `POST /shop/assistant/voice/confirm` `{ transcript }` → same `AssistantService.chat`
- `POST /shop/assistant/tts` `{ text }` → base64 audio

## Limits
- Max size: 5 MB
- Max duration: 60 seconds
- Formats: mp3, m4a, wav, ogg/opus, webm (magic-byte validated)
- Rate limit: 20 voice requests / minute / customer

## Retention
Audio is processed in memory/temp and deleted after STT. No permanent storage without explicit consent + retention policy update.

## Approximate OpenAI cost (list prices; update when billing changes)
| Step | Model (default) | Approx USD |
|------|-----------------|------------|
| STT | whisper-1 | **~$0.006 / minute** of input audio |
| TTS (optional) | gpt-4o-mini-tts | **~$0.015 / minute** of output audio |

Examples:
- 30s voice question, text reply only ≈ **$0.003**
- 30s question + listen-to-reply (~30s TTS) ≈ **$0.0105**

Set `OPENAI_API_KEY` on the **API server only**. Never ship the key to the browser.
