import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Server-verified result of `/shop/check-flight-offer`; opaque to the customer (contains cost). */
export type FlightCheckClaims = {
  ref: string;
  companionRef?: string;
  providerKey: string;
  costAmountMinor: number;
  sellAmountMinor: number;
  previousSellAmountMinor?: number;
  pricingRuleId?: string | null;
  currency: string;
  priceChanged: boolean;
  extras: Array<{ id: string; amountMinor: number }>;
  validatedAt: string;
  exp: number;
};

const TTL_MS = 20 * 60 * 1000;

function key(): Buffer {
  const secret =
    process.env.APP_SECRET?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    process.env.JWT_SECRET?.trim();
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("APP_SECRET is required to sign flight price checks");
  }
  return createHash("sha256")
    .update(`flight-check:${secret || "dev-flight-check-secret"}`)
    .digest();
}

export function issueFlightCheckToken(
  claims: Omit<FlightCheckClaims, "exp" | "validatedAt"> & { validatedAt?: string },
): { token: string; claims: FlightCheckClaims } {
  const validatedAt = claims.validatedAt || new Date().toISOString();
  const full: FlightCheckClaims = {
    ...claims,
    validatedAt,
    exp: Date.parse(validatedAt) + TTL_MS,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(full), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    token: [iv, tag, data].map((part) => part.toString("base64url")).join("."),
    claims: full,
  };
}

export function readFlightCheckToken(token: unknown): FlightCheckClaims | null {
  if (typeof token !== "string") return null;
  const [ivPart, tagPart, dataPart, ...rest] = token.split(".");
  if (!ivPart || !tagPart || !dataPart || rest.length) return null;
  try {
    const iv = Buffer.from(ivPart, "base64url");
    const tag = Buffer.from(tagPart, "base64url");
    const data = Buffer.from(dataPart, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    const claims = JSON.parse(json) as FlightCheckClaims;
    if (!claims || typeof claims.exp !== "number" || claims.exp < Date.now()) return null;
    if (!Number.isFinite(claims.sellAmountMinor) || claims.sellAmountMinor <= 0) return null;
    return claims;
  } catch {
    return null;
  }
}
