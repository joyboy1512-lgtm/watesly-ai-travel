import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function secretsKey(): Buffer {
  const raw =
    process.env.PROVIDER_SECRETS_KEY?.trim() ||
    process.env.APP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "weekendgate-provider-secrets-dev";
  return createHash("sha256").update(raw).digest();
}

/** Encrypt JSON-serializable config for TravelProviderConfig.configEncrypted */
export function encryptProviderConfig(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretsKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value ?? {}), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptProviderConfig<T = Record<string, string>>(
  payload?: string | null,
): T | null {
  if (!payload?.trim()) return null;
  try {
    if (!payload.startsWith("v1:")) {
      return JSON.parse(payload) as T;
    }
    const [, ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      secretsKey(),
      Buffer.from(ivB64, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64url")),
      decipher.final(),
    ]);
    return JSON.parse(dec.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function maskSecret(value?: string | null) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}
