/** Next.js inlines NEXT_PUBLIC_* at build time — must read the literal key. */
export function platformEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WG_PLATFORM === "1";
}
