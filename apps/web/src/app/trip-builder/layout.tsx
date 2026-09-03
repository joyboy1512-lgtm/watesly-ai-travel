"use client";

import { TripBuilderProvider } from "@/components/trip-builder/TripBuilderProvider";
import "../shop.css";
import "../platform.css";
import "../travela-skin.css";
import "@/components/trip-builder/trip-builder.css";

export default function TripBuilderLayout({ children }: { children: React.ReactNode }) {
  return <TripBuilderProvider>{children}</TripBuilderProvider>;
}
