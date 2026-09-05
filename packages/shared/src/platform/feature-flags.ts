/**
 * Platform v2 (Trip Builder, Deals, Destinations, Loyalty, …).
 * Default OFF so production stays unchanged until NEXT_PUBLIC_WG_PLATFORM=1.
 */
export function isPlatformEnabled(
  env: Record<string, string | undefined> = {},
): boolean {
  const fromArg = env.NEXT_PUBLIC_WG_PLATFORM ?? env.WG_PLATFORM;
  if (fromArg !== undefined) {
    return String(fromArg).trim() === "1";
  }
  try {
    // eslint-disable-next-line no-undef
    const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
    const v = g.process?.env?.NEXT_PUBLIC_WG_PLATFORM ?? g.process?.env?.WG_PLATFORM;
    return String(v || "").trim() === "1";
  } catch {
    return false;
  }
}
