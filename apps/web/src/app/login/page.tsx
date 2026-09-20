"use client";

import "../staff-login.css";

import { Suspense } from "react";
import StaffLoginForm from "./StaffLoginForm";

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="staff-login">
          <section className="staff-login-panel">
            <p className="lead">جارٍ التحميل...</p>
          </section>
        </main>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
