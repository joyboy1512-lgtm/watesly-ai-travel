"use client";

import { FormEvent, useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { getShopSession } from "@/lib/shop-session";
import { applyReferralCode, fetchReferral } from "@/lib/platform-api";
import type { ReferralRecord } from "@watesly-travel/shared";

export default function ReferralsPage() {
  const [ref, setRef] = useState<ReferralRecord | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login?next=/account/referrals");
      return;
    }
    fetchReferral()
      .then(setRef)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function apply(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const res = await applyReferralCode(code);
      if (!res.ok) setError(res.error || "فشل");
      else setMsg("تم تطبيق كود الإحالة والمكافأة");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    }
  }

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>🎁 الإحالات</h1>
        <p className="lead">شارك كودك مع الأصدقاء — عند أول حجز يحصل الطرفان على نقاط.</p>
        {ref ? (
          <div className="wg-trip-summary" style={{ maxWidth: 420 }}>
            <strong>كودك</strong>
            <p className="final" style={{ border: 0, padding: 0, fontFamily: "ui-monospace, monospace" }}>
              {ref.code}
            </p>
            <p style={{ margin: 0, color: "#64748b" }}>عدد الاستخدامات: {ref.uses}</p>
          </div>
        ) : null}
        <form onSubmit={apply} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <input
            placeholder="كود صديق"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" className="wg-btn">
            تطبيق الكود
          </button>
        </form>
        {msg ? <p style={{ color: "#18785a" }}>{msg}</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </div>
    </StoreFront>
  );
}
