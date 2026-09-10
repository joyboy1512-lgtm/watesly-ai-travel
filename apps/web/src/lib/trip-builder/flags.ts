/** Show رحلتي boarding pass when new UI is on */
export function ruheltiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_WG_NEW_UI === "1" || process.env.NEXT_PUBLIC_WG_PLATFORM === "1";
}
