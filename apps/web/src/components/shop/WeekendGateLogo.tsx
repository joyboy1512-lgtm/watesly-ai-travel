export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  return (
    <span className={`wg-logo wg-logo-lockup${light ? " wg-logo-light" : ""}`} dir="ltr">
      <span className="wg-logo-word">
        Weekend<span className="wg-logo-gate">Gate</span>
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="wg-logo-mark"
        src="/brand/wg-monogram-gold.png"
        alt=""
        width={52}
        height={24}
      />
    </span>
  );
}
