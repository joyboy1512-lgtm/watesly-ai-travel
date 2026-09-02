export function WeekendGateLogo({ light = false }: { light?: boolean }) {
  return (
    <span className={`wg-logo${light ? " wg-logo-light" : ""}`} dir="ltr">
      <span className="wg-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="36" height="36" focusable="false">
          <rect className="wg-logo-mark-bg" width="40" height="40" rx="10" />
          <path
            className="wg-logo-mark-fg"
            d="M8.2 28.5 12.1 11.8h3.1l2.05 9.2 2.05-9.2h3.05L26.2 28.5h-3.05l-1.35-7.15L19.6 28.5h-2.85l-2.2-7.15L13.2 28.5H8.2zm18.35 0V11.8h6.55c1.55 0 2.75.35 3.6 1.05.85.7 1.25 1.7 1.25 3 0 .95-.25 1.75-.75 2.4-.5.65-1.2 1.1-2.1 1.35l3.25 8.9h-3.25l-2.95-8.35h-2.35v8.35h-3.25zm3.25-11.05h2.85c.7 0 1.2-.15 1.55-.5.35-.35.5-.8.5-1.4 0-.6-.15-1.05-.5-1.35-.35-.3-.85-.45-1.55-.45h-2.85v3.7z"
          />
        </svg>
      </span>
      <span className="wg-logo-word">
        Weekend<span className="wg-logo-gate">Gate</span>
      </span>
    </span>
  );
}
