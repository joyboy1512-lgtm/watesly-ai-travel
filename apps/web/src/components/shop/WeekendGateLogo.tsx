export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  return (
    <span className={`wg-logo wg-logo-lockup${light ? " wg-logo-light" : ""}`} dir="ltr">
      <span className="wg-logo-word">
        Weekend
        <span className="wg-logo-gate-wrap">
          <span className="wg-logo-gate">Gate</span>
          <svg
            className="wg-logo-plane"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
            />
          </svg>
          <span className="wg-logo-swoosh" aria-hidden="true" />
        </span>
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
