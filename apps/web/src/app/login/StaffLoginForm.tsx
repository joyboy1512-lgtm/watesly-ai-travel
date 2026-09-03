"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { loginRequest, saveSession } from "@/lib/api";

export default function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard/inquiries";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await loginRequest(email.trim(), password);
      saveSession(session);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell staff-login">
      <div className="staff-login-card">
        <p className="brand">{COMPANY_LEGAL.brandName}</p>
        <p className="hint">{COMPANY_LEGAL.legalNameAr}</p>
        <h1>دخول فريق العمل</h1>
        <p className="lead">لوحة التحكم — الاستعلامات، الحجوزات، والمحادثات</p>
        {error ? <p className="error">{error}</p> : null}
        <form className="form-grid" onSubmit={onSubmit}>
          <label>
            البريد الإلكتروني
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? "..." : "دخول"}
          </button>
        </form>
        <p className="hint staff-login-foot">
          <Link href="/">← العودة إلى الموقع</Link>
        </p>
      </div>
    </main>
  );
}
