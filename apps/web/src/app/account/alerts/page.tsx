"use client";

import { FormEvent, useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { getShopSession } from "@/lib/shop-session";
import { createAlert, fetchAlerts, formatKwdMinor } from "@/lib/platform-api";
import type { PriceAlert } from "@watesly-travel/shared";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [origin, setOrigin] = useState("KWI");
  const [destination, setDestination] = useState("DXB");
  const [current, setCurrent] = useState("150");
  const [target, setTarget] = useState("120");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login?next=/account/alerts");
      return;
    }
    fetchAlerts()
      .then(setAlerts)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const row = await createAlert({
        origin,
        destination,
        currentPriceMinor: Math.round(Number(current) * 1000),
        targetPriceMinor: Math.round(Number(target) * 1000),
        currency: "KWD",
      });
      setAlerts((prev) => [row, ...prev]);
      setOk("تم تفعيل التنبيه 🔔");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إنشاء التنبيه");
    }
  }

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>🔔 تنبيهات السعر</h1>
        <p className="lead">أخبرني إذا انخفض السعر إلى هدفك.</p>
        <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.55rem", maxWidth: 420 }}>
          <label>
            من
            <input value={origin} onChange={(e) => setOrigin(e.target.value.toUpperCase())} />
          </label>
          <label>
            إلى
            <input value={destination} onChange={(e) => setDestination(e.target.value.toUpperCase())} />
          </label>
          <label>
            السعر الحالي (د.ك)
            <input value={current} onChange={(e) => setCurrent(e.target.value)} inputMode="decimal" />
          </label>
          <label>
            السعر المستهدف (د.ك)
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" />
          </label>
          <button type="submit" className="wg-btn">
            🔔 أخبرني إذا انخفض السعر
          </button>
        </form>
        {ok ? <p style={{ color: "#18785a" }}>{ok}</p> : null}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <ul>
          {alerts.map((a) => (
            <li key={a.id}>
              {a.origin} → {a.destination}: الهدف {formatKwdMinor(a.targetPriceMinor, a.currency)}
              {a.active ? " · نشط" : ""}
            </li>
          ))}
        </ul>
      </div>
    </StoreFront>
  );
}
