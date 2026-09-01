"use client";

import { Suspense } from "react";
import StaffLoginForm from "./StaffLoginForm";

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="shell staff-login">
          <p className="lead">جارٍ التحميل...</p>
        </main>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
