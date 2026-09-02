export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  return (
    <span className={`wg-logo${light ? " wg-logo-light" : ""}`} dir="ltr">
      <span className="wg-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="36" height="36" focusable="false">
          <rect className="wg-logo-mark-bg" width="40" height="40" rx="10" />
          {/* W */}
          <path
            className="wg-logo-mark-fg"
            d="M5.8 28.8 9.1 11.6h3.05l1.85 9.55 1.85-9.55h3.05L22.7 28.8h-3.2l-1.45-8.05-1.55 8.05h-2.7l-1.55-8.05-1.45 8.05H5.8z"
          />
          {/* G */}
          <path
            className="wg-logo-mark-fg"
            d="M24.2 20.2c0-5.05 3.15-8.9 8.05-8.9 2.35 0 4.2.75 5.55 2.15l-2.15 2.2c-.9-.9-1.95-1.4-3.3-1.4-2.85 0-4.75 2.3-4.75 5.95s1.9 5.95 4.85 5.95c1.45 0 2.55-.45 3.45-1.25v-2.35h-3.55v-2.85h6.7v6.45c-1.55 1.7-3.85 2.85-6.75 2.85-4.95 0-8.1-3.75-8.1-8.8z"
          />
        </svg>
      </span>
      <span className="wg-logo-word">
        Weekend<span className="wg-logo-gate">Gate</span>
      </span>
    </span>
  );
}
