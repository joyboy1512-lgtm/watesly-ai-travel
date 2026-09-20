"use client";

import "../staff-login.css";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { COMPANY_LEGAL } from "@watesly-travel/shared";
import { WeekendGateLogo } from "@/components/shop/WeekendGateLogo";
import { loginRequest, saveSession } from "@/lib/api";
import { safeNextPath } from "@/lib/safe-next-path";

const DESK_LIST = [
  "الاستعلامات",
  "الحجوزات",
  "مزودو السفر",
  "قواعد التسعير",
  "العملاء",
  "واتساب",
];

export default function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/dashboard/inquiries");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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
    <main className="staff-login">
      <section className="staff-login-brand">
        <WeekendGateLogo light />
        <h1>{COMPANY_LEGAL.legalNameAr}</h1>
        <ul className="staff-login-menu">
          {DESK_LIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="staff-login-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="staff-login-panel-photo"
          src="/media/hero/night-city-gold.jpg"
          alt=""
          aria-hidden="true"
        />
        <div className="staff-login-card">
          <div className="staff-login-logo-card">
            <WeekendGateLogo light />
            <strong>{COMPANY_LEGAL.brandName}</strong>
            <span className="staff-login-logo-legal">{COMPANY_LEGAL.legalNameAr}</span>
          </div>
          <h2>تسجيل الدخول</h2>
          {error ? <p className="staff-login-alert">{error}</p> : null}
          <form className="staff-login-form" onSubmit={onSubmit}>
            <label className="staff-login-field">
              <span>البريد الإلكتروني</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label className="staff-login-field">
              <span>كلمة المرور</span>
              <span className="staff-login-pass">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="staff-login-eye"
                  onClick={() => setShowPass((v) => !v)}
                >
                  {showPass ? "إخفاء" : "إظهار"}
                </button>
              </span>
            </label>
            <button type="submit" className="staff-login-submit" disabled={busy}>
              {busy ? "جارٍ الدخول..." : "دخول"}
            </button>
          </form>
          <p className="staff-login-foot">
            <Link href="/">العودة إلى الموقع</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
