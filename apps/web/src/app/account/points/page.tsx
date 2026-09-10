"use client";

import { useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { getShopSession } from "@/lib/shop-session";
import { fetchPoints } from "@/lib/platform-api";
import type { CustomerPointsAccount, PointsRules } from "@watesly-travel/shared";

export default function PointsPage() {
  const [account, setAccount] = useState<CustomerPointsAccount | null>(null);
  const [rules, setRules] = useState<PointsRules | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login?next=/account/points");
      return;
    }
    fetchPoints()
      .then((r) => {
        setAccount(r.account);
        setRules(r.rules);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>⭐ Weekend Points</h1>
        <p className="lead">اكسب نقاطاً من كل حجز مؤهل واستخدمها لخصومات ومزايا.</p>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div className="wg-trip-summary" style={{ maxWidth: 420 }}>
          <strong>رصيدك</strong>
          <p className="final" style={{ border: 0, padding: 0 }}>
            {(account?.balance ?? 0).toLocaleString("en-KW")} نقطة
          </p>
          {rules ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
              كل 1 د.ك ≈ {rules.earnPerKwdMinor} نقطة · الحد الأدنى للاستبدال {rules.minRedeemPoints}
            </p>
          ) : null}
        </div>
        <h2 style={{ marginTop: "1.5rem", fontSize: "1.05rem" }}>السجل</h2>
        <ul>
          {(account?.entries || []).slice(0, 20).map((e) => (
            <li key={e.id}>
              {e.delta > 0 ? "+" : ""}
              {e.delta} · {e.reason} · {new Date(e.createdAt).toLocaleString("ar-KW")}
            </li>
          ))}
        </ul>
      </div>
    </StoreFront>
  );
}
