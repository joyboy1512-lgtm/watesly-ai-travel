export type PassportScanFields = {
  title?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiry?: string;
};

export type PassportScanInput = {
  imageBase64: string;
  mimeType: string;
};

export type PassportScanResult = {
  fields: PassportScanFields;
  confidence: number;
  provider: string;
  model: string;
  rawText?: string;
  notes?: string;
};

function stripDataUrl(base64: string) {
  const idx = base64.indexOf("base64,");
  return idx >= 0 ? base64.slice(idx + 7) : base64;
}

function normalizeDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(20\d{2}|19\d{2})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](19\d{2}|20\d{2})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  }

  // YYMMDD from MRZ
  const mrz = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (mrz) {
    const yy = Number(mrz[1]);
    const year = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${year}-${mrz[2]}-${mrz[3]}`;
  }
  return undefined;
}

function guessTitle(sex?: string | null): string | undefined {
  if (!sex) return undefined;
  const s = sex.trim().toUpperCase();
  if (s === "M" || s === "MALE" || s === "ذكر") return "mr";
  if (s === "F" || s === "FEMALE" || s === "أنثى" || s === "انثى") return "mrs";
  return undefined;
}

/** Parse ICAO MRZ TD3 lines when present in OCR text. */
export function parseMrzText(text: string): PassportScanFields {
  const lines = text
    .toUpperCase()
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, "").trim())
    .filter((l) => l.includes("<") && l.length >= 28);

  const line1 = lines.find((l) => l.startsWith("P<") || l.startsWith("P"));
  const line2 = lines.find(
    (l) => !l.startsWith("P") && /^[A-Z0-9<]{28,}$/.test(l),
  );

  const fields: PassportScanFields = {};

  if (line1) {
    const cleaned = line1.startsWith("P<") ? line1.slice(2) : line1.slice(1);
    const nationality = cleaned.slice(0, 3).replace(/</g, "");
    const names = cleaned.slice(3).split("<<");
    const lastName = (names[0] || "").replace(/</g, " ").trim();
    const firstName = (names[1] || "").replace(/</g, " ").trim();
    if (nationality) fields.nationality = nationality;
    if (lastName) fields.lastName = lastName;
    if (firstName) fields.firstName = firstName;
  }

  if (line2) {
    const passportNumber = line2.slice(0, 9).replace(/</g, "");
    const nationality = line2.slice(10, 13).replace(/</g, "");
    const birth = normalizeDate(line2.slice(13, 19));
    const sex = line2.slice(20, 21);
    const expiry = normalizeDate(line2.slice(21, 27));
    if (passportNumber) fields.passportNumber = passportNumber;
    if (nationality) fields.nationality = fields.nationality || nationality;
    if (birth) fields.birthDate = birth;
    if (expiry) fields.passportExpiry = expiry;
    const title = guessTitle(sex);
    if (title) fields.title = title;
  }

  return fields;
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const fenced = content.match(/\{[\s\S]*\}/);
  if (!fenced) return null;
  try {
    return JSON.parse(fenced[0]!) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function fieldsFromModelJson(data: Record<string, unknown>): PassportScanFields {
  const str = (k: string) => {
    const v = data[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  return {
    title: guessTitle(str("sex") || str("gender")) || str("title"),
    firstName: str("firstName") || str("givenNames") || str("given_names"),
    lastName: str("lastName") || str("surname") || str("familyName"),
    birthDate: normalizeDate(str("birthDate") || str("dateOfBirth") || str("dob")),
    nationality: (str("nationality") || str("issuingCountry") || "")
      .toUpperCase()
      .slice(0, 3) || undefined,
    passportNumber: str("passportNumber") || str("documentNumber") || str("number"),
    passportExpiry: normalizeDate(
      str("passportExpiry") || str("expiryDate") || str("dateOfExpiry"),
    ),
  };
}

function hasUsefulFields(fields: PassportScanFields) {
  return Boolean(
    fields.passportNumber ||
      (fields.firstName && fields.lastName) ||
      fields.birthDate,
  );
}

function aiConfig() {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.AI_API_KEY ||
    "";
  const baseUrl = (
    process.env.AI_BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model =
    process.env.AI_VISION_MODEL ||
    process.env.OPENAI_VISION_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.AI_MODEL ||
    "gpt-4o-mini";
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 45000);
  return { apiKey, baseUrl, model, timeoutMs };
}

function completionLimitBody(model: string, tokens: number) {
  // Newer OpenAI/Cursor models reject max_tokens on chat/completions.
  if (/gpt-5|o[134]|gpt-4\.1/i.test(model)) {
    return { max_completion_tokens: tokens };
  }
  return { max_tokens: tokens };
}

function chatCompletionBody(model: string, prompt: string, mime: string, rawBase64: string) {
  const tokens = Number(process.env.AI_MAX_OUTPUT_TOKENS || 800);
  const body: Record<string, unknown> = {
    model,
    ...completionLimitBody(model, tokens),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${rawBase64}`,
            },
          },
        ],
      },
    ],
  };
  // gpt-5+ on Cursor/OpenAI only supports default temperature.
  if (!/gpt-5|o[134]|gpt-4\.1/i.test(model)) {
    body.temperature = 0;
  }
  return body;
}

/**
 * Extract passport fields from an image using a vision-capable LLM.
 * Falls back to MRZ parsing from any returned text.
 */
export async function extractPassportFromImage(
  input: PassportScanInput,
): Promise<PassportScanResult> {
  const { apiKey, baseUrl, model, timeoutMs } = aiConfig();
  const mime = input.mimeType || "image/jpeg";
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
    throw new Error("صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP");
  }

  const rawBase64 = stripDataUrl(input.imageBase64);
  if (!rawBase64 || rawBase64.length < 100) {
    throw new Error("صورة الجواز غير صالحة");
  }
  // ~6MB decoded roughly
  if (rawBase64.length > 8_000_000) {
    throw new Error("حجم الصورة كبير جدًا. استخدم صورة أوضح وأصغر من 6MB");
  }

  if (!apiKey) {
    return {
      fields: {},
      confidence: 0,
      provider: "none",
      model: "unconfigured",
      notes:
        "فعّل OPENAI_API_KEY أو AI_API_KEY في ملف البيئة لتفعيل مسح الجواز بالذكاء الاصطناعي",
    };
  }

  const prompt = `You are a passport MRZ/OCR assistant for a travel booking system.
Read the passport image carefully (visual zone and MRZ if visible).
Return ONLY valid JSON with these keys:
{
  "firstName": string,
  "lastName": string,
  "birthDate": "YYYY-MM-DD",
  "nationality": "ISO3 like SAU or 2-letter like SA if that is what appears",
  "passportNumber": string,
  "passportExpiry": "YYYY-MM-DD",
  "sex": "M or F",
  "mrzText": "optional raw MRZ lines",
  "confidence": number between 0 and 1
}
Use empty string for unknown fields. Do not invent values.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify(chatCompletionBody(model, prompt, mime, rawBase64)),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `فشل مسح الجواز عبر الذكاء الاصطناعي (${response.status})${errText ? `: ${errText.slice(0, 180)}` : ""}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim() || "";
    const json = parseJsonObject(content);
    let fields: PassportScanFields = json ? fieldsFromModelJson(json) : {};
    const mrzText =
      (typeof json?.mrzText === "string" && json.mrzText) || content;
    const mrzFields = parseMrzText(mrzText);
    fields = { ...mrzFields, ...Object.fromEntries(
      Object.entries(fields).filter(([, v]) => Boolean(v)),
    ) };

    const confidenceRaw =
      typeof json?.confidence === "number" ? json.confidence : undefined;
    const confidence =
      confidenceRaw ?? (hasUsefulFields(fields) ? 0.75 : 0.2);

    if (!hasUsefulFields(fields)) {
      return {
        fields,
        confidence: 0,
        provider: "openai-compatible",
        model,
        rawText: content.slice(0, 500),
        notes: "تعذر قراءة بيانات كافية من الصورة. جرّب صورة أوضح لصفحة الجواز",
      };
    }

    // Normalize nationality to 2 letters when common ISO3 codes appear
    if (fields.nationality && fields.nationality.length === 3) {
      const map: Record<string, string> = {
        SAU: "SA",
        ARE: "AE",
        KWT: "KW",
        QAT: "QA",
        BHR: "BH",
        OMN: "OM",
        EGY: "EG",
        JOR: "JO",
        USA: "US",
        GBR: "GB",
      };
      fields.nationality = map[fields.nationality] || fields.nationality;
    }

    return {
      fields,
      confidence,
      provider: "openai-compatible",
      model,
      rawText: typeof json?.mrzText === "string" ? json.mrzText : undefined,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("انتهت مهلة مسح الجواز. حاول مجددًا بصورة أصغر");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
