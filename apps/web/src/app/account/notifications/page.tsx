"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { getShopSession, shopFetch } from "@/lib/shop-session";
import { fetchNotifications } from "@/lib/platform-api";
import type { CustomerNotification } from "@watesly-travel/shared";

export default function CustomerNotificationsPage() {
  const [rows, setRows] = useState<CustomerNotification[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login?next=/account/notifications");
      return;
    }
    fetchNotifications()
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  async function markRead(id: string) {
    try {
      await shopFetch(`/shop/platform/me/notifications/${id}/read`, { method: "POST", body: "{}" });
      setRows((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      /* ignore */
    }
  }

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>🔔 الإشعارات</h1>
        <p className="lead">تأكيدات الحجز والدفع، تغيّر الرحلة، انخفاض السعر، النقاط والعروض.</p>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "grid", gap: "0.65rem" }}>
          {rows.map((n) => (
            <article
              key={n.id}
              className="wg-platform-card"
              style={{ opacity: n.read ? 0.7 : 1 }}
            >
              <div className="body">
                <strong>{n.title}</strong>
                <p style={{ margin: 0 }}>{n.body}</p>
                <small style={{ color: "#64748b" }}>
                  {new Date(n.createdAt).toLocaleString("ar-KW")} · {n.channels.join(", ")}
                </small>
                <div style={{ display: "flex", gap: "0.45rem" }}>
                  {!n.read ? (
                    <button type="button" className="wg-btn secondary" onClick={() => markRead(n.id)}>
                      تحديد كمقروء
                    </button>
                  ) : null}
                  {n.href ? (
                    <Link className="wg-btn secondary" href={n.href}>
                      فتح
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!rows.length && !error ? <p>لا إشعارات بعد.</p> : null}
        </div>
      </div>
    </StoreFront>
  );
}
