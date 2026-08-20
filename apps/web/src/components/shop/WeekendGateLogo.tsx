export function WeekendGateLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span className={`wg-logo${compact ? " wg-logo-compact" : ""}`}>
      <svg className="wg-logo-mark" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="32" fill="#00255D" />
        <path
          d="M18 42c0-10.5 6.2-16 14-16s14 5.5 14 16"
          stroke="#fff"
          strokeWidth="3.2"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M22 42h20" stroke="#1668E3" strokeWidth="3.2" strokeLinecap="round" />
        <path
          d="M32 12l2.4 7.2 7.6.2-6 4.6 2.1 7.4L32 27.6l-6.1 3.8 2.1-7.4-6-4.6 7.6-.2L32 12z"
          fill="#FFC72C"
        />
        <path
          d="M14 28.5c8.2 1.4 16.8 4.8 24.8 10.2 1.1.7 2.3-.4 1.7-1.5-2.6-5.1-1.8-9.6 1.8-12.2.6-.4.4-1.3-.3-1.5-7.4-1.8-15.8.4-24.4 4.2-.9.4-1.3 1.5-.7 2.3 1.1 1.7 1.4 2.9 1.1 4.5z"
          fill="#fff"
        />
      </svg>
      <span className="wg-logo-word">
        Weekend<span>Gate</span>
      </span>
    </span>
  );
}
