"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SUPPORTED_CURRENCIES } from "@watesly-travel/shared";
import { AppShell } from "@/components/AppShell";
import { apiFetch } from "@/lib/api";
import { setPreferredCurrency } from "@/lib/currency";

type Org = {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  timezone: string;
};

export default function SettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("KWD");
  const [timezone, setTimezone] = useState("Asia/Kuwait");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    const organization = await apiFetch<Org>("/organizations/current");
    setOrg(organization);
    setName(organization.name);
    setCurrency(organization.defaultCurrency || "KWD");
    setTimezone(organization.timezone || "Asia/Kuwait");
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  async function save() {
    setError("");
    setOk("");
    try {
      const updated = await apiFetch<Org>("/organizations/current", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          defaultCurrency: currency,
          timezone,
        }),
      });
      setOrg(updated);
      setPreferredCurrency(currency);
      setOk("تم حفظ الإعدادات");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل الحفظ");
    }
  }

  return (
    <AppShell title="الإعدادات">
      <div className="panel">
        <div className="form-grid">
          <label className="field">
            <span>اسم المؤسسة</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <p className="hint">
            يظهر في تذييل الموقع كاسم الجهة التشغيلية. شعار WeekendGate يبقى ثابتاً في الواجهة.
          </p>
          <label className="field">
            <span>المعرّف</span>
            <input value={org?.slug || ""} disabled />
          </label>
          <label className="field">
            <span>العملة</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>المنطقة الزمنية</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="Asia/Kuwait">الكويت (Asia/Kuwait)</option>
              <option value="Asia/Riyadh">الرياض (Asia/Riyadh)</option>
              <option value="Asia/Dubai">دبي (Asia/Dubai)</option>
              <option value="Asia/Qatar">قطر (Asia/Qatar)</option>
              <option value="Africa/Cairo">القاهرة (Africa/Cairo)</option>
            </select>
          </label>
        </div>
        <div className="actions">
          <button type="button" className="btn" onClick={save}>
            حفظ
          </button>
          <Link className="btn secondary" href="/dashboard/whatsapp">
            ربط واتساب
          </Link>
          <Link className="btn secondary" href="/dashboard/templates">
            قوالب واتساب
          </Link>
        </div>
        {ok ? <p className="hint">{ok}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </AppShell>
  );
}
