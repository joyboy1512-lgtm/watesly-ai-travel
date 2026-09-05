/**
 * Unified WeekendGate lockup — same asset family on every page.
 * - light: white+gold (hero / dark overlays)
 * - default: navy+gold (white headers)
 */
export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  const src = light ? "/brand/wg-lockup.png" : "/brand/wg-lockup-dark.png";
  const srcSet = light
    ? "/brand/wg-lockup.png 1x, /brand/wg-lockup@2x.png 2x"
    : "/brand/wg-lockup-dark.png 1x, /brand/wg-lockup-dark@2x.png 2x";

  return (
    <span
      className={`wg-logo wg-logo-lockup${light ? " wg-logo-light" : " wg-logo-dark"}`}
      dir="ltr"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="wg-logo-lockup-img"
        src={src}
        srcSet={srcSet}
        alt="WeekendGate"
        height={40}
      />
    </span>
  );
}
