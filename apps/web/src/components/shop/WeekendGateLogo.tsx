export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  return (
    <span className={`wg-logo wg-logo-single${light ? " wg-logo-light" : ""}`} dir="ltr">
      <span className="wg-logo-word">
        Weekend<span className="wg-logo-gate">Gate</span>
      </span>
    </span>
  );
}
