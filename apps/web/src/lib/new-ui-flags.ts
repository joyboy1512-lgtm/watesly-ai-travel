/** Toggle glass/mobile-first reskin — set NEXT_PUBLIC_WG_NEW_UI=1 at build time. */
export function newUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WG_NEW_UI === "1";
}
