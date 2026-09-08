"use client";

type Step = "select" | "travelers" | "payment" | "confirm";

const STEPS: Array<{ key: Step; label: string; n: number }> = [
  { key: "select", label: "اختيار الرحلة", n: 1 },
  { key: "travelers", label: "بيانات المسافر", n: 2 },
  { key: "payment", label: "الدفع", n: 3 },
  { key: "confirm", label: "التأكيد", n: 4 },
];

export function TripProgressStepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="wg-ru-stepper" aria-label="مراحل الحجز">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="wg-ru-step-item">
            {i > 0 ? (
              <span className={`wg-ru-step-line${done || active ? " on" : ""}`} aria-hidden />
            ) : null}
            <div
              className={`wg-ru-step-node${done ? " done" : ""}${active ? " active" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="wg-ru-step-circle">{done ? "✓" : step.n}</span>
              <span className="wg-ru-step-label">{step.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function TripServicesRibbon({
  services = ["flight", "hotel", "transfer", "activity"],
}: {
  services?: string[];
}) {
  const items = [
    { key: "flight", label: "الطيران" },
    { key: "hotel", label: "الفندق" },
    { key: "transfer", label: "المواصلات" },
    { key: "activity", label: "الأنشطة" },
  ];
  return (
    <div className="wg-ru-services-ribbon" aria-label="خدمات الرحلة">
      {items.map((it, i) => {
        const on = services.includes(it.key);
        return (
          <div key={it.key} className="wg-ru-svc-item">
            {i > 0 ? <span className={`wg-ru-svc-dash${on ? " on" : ""}`} /> : null}
            <span className={`wg-ru-svc-dot${on ? " on" : ""}`}>{on ? "✓" : i + 1}</span>
            <span className="wg-ru-svc-label">{it.label}</span>
          </div>
        );
      })}
    </div>
  );
}
