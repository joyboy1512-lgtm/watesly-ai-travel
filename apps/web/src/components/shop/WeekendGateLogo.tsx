export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  // On hero (light), use the exact approved lockup asset for a 1:1 match.
  if (light) {
    return (
      <span className="wg-logo wg-logo-lockup wg-logo-light" dir="ltr">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="wg-logo-lockup-img"
          src="/brand/wg-lockup.png"
          srcSet="/brand/wg-lockup.png 1x, /brand/wg-lockup@2x.png 2x"
          alt="WeekendGate"
          height={40}
        />
      </span>
    );
  }

  return (
    <span className="wg-logo wg-logo-lockup" dir="ltr">
      <span className="wg-logo-word">
        Weekend<span className="wg-logo-gate">Gate</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="wg-logo-mark"
        src="/brand/wg-monogram-gold.png"
        alt=""
        width={76}
        height={34}
      />
    </span>
  );
}
