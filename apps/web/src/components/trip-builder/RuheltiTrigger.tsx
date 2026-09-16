"use client";

import { useTripBuilder } from "./TripBuilderProvider";

type Props = {
  className?: string;
};

export function RuheltiTrigger({ className }: Props) {
  const { openBoarding } = useTripBuilder();

  return (
    <button
      type="button"
      className={className || "wg-ruhelti-trigger"}
      onClick={() => openBoarding()}
      aria-haspopup="dialog"
    >
      <span aria-hidden>🎫</span>
      رحلتي
    </button>
  );
}
