"use client";

type Step = "select" | "travelers" | "payment" | "confirm";

const STEPS: Array<{ key: Step; label: string }> = [
  { key: "select", label: "اختيار الرحلة" },
  { key: "travelers", label: "بيانات المسافر" },
  { key: "payment", label: "الدفع" },
  { key: "confirm", label: "التأكيد" },
];

export function TripProgressStepper({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <nav className="wg-trip-stepper" aria-label="مراحل الحجز">
      {STEPS.map((step, i) => (
        <div
          key={step.key}
          className={`wg-trip-step${i < idx ? " done" : ""}${i === idx ? " active" : ""}`}
          aria-current={i === idx ? "step" : undefined}
        >
          {i < idx ? "✓ " : `${i + 1}. `}
          {step.label}
        </div>
      ))}
    </nav>
  );
}
