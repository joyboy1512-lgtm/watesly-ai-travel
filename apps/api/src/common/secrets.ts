import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { isProductionRuntime, requireStrongSecret } from "./security-env";

/**
 * Resolve encryption key material.
 * Production: PROVIDER_SECRETS_KEY (or APP_SECRET) required — no hardcoded fallback.
 *
 * Migration plan (do not rotate blindly):
 * 1. Set PROVIDER_SECRETS_KEY to the *same* material currently used in production
 *    so existing v1: blobs still decrypt.
 * 2. Re-encrypt provider configs under the dedicated key.
 * 3. Only then rotate to a new random key (dual-decrypt via PROVIDER_SECRETS_KEY_LEGACY).
 */
function keyFromMaterial(raw: string): Buffer {
  return createHash("sha256").update(raw).digest();
}

function primarySecretsMaterial(): string {
  if (isProductionRuntime()) {
    return requireStrongSecret(
      "PROVIDER_SECRETS_KEY",
      process.env.PROVIDER_SECRETS_KEY || process.env.APP_SECRET,
    );
  }
  return (
    process.env.PROVIDER_SECRETS_KEY?.trim() ||
    process.env.APP_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    "weekendgate-provider-secrets-dev"
  );
}

function secretsKey(): Buffer {
  return keyFromMaterial(primarySecretsMaterial());
}

function legacySecretsKeys(): Buffer[] {
  const keys: Buffer[] = [];
  const legacy = process.env.PROVIDER_SECRETS_KEY_LEGACY?.trim();
  if (legacy) keys.push(keyFromMaterial(legacy));
  for (const candidate of [
    process.env.JWT_ACCESS_SECRET?.trim(),
    process.env.JWT_SECRET?.trim(),
    "weekendgate-provider-secrets-dev",
  ]) {
    if (candidate) keys.push(keyFromMaterial(candidate));
  }
  return keys;
}

export function encryptProviderConfig(value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretsKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(value ?? {}), "utf8");
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

function decryptWithKey<T>(payload: string, key: Buffer): T | null {
  try {
    const [, ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
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

export function decryptProviderConfig<T = Record<string, string>>(
  payload?: string | null,
): T | null {
  if (!payload?.trim()) return null;
  if (!payload.startsWith("v1:")) {
    if (isProductionRuntime()) {
      // Refuse plaintext legacy blobs in production.
      return null;
    }
    try {
      return JSON.parse(payload) as T;
    } catch {
      return null;
    }
  }
  const primary = decryptWithKey<T>(payload, secretsKey());
  if (primary) return primary;
  for (const key of legacySecretsKeys()) {
    const hit = decryptWithKey<T>(payload, key);
    if (hit) return hit;
  }
  return null;
}

export function maskSecret(value?: string | null) {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${"*".repeat(Math.min(12, value.length - 4))}${value.slice(-4)}`;
}
