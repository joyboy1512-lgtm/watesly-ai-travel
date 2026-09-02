"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../../shop.css";
import "../../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { getShopSession } from "@/lib/shop-session";
import { fetchMyTrips, formatKwdMinor } from "@/lib/platform-api";
import type { MyTrip } from "@watesly-travel/shared";

const STATUS_AR: Record<string, string> = {
  confirmed: "✔️",
  pending: "⏳",
  cancelled: "✕",
  none: "—",
};

export default function MyTripsPage() {
  const [trips, setTrips] = useState<MyTrip[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login?next=/account/trips");
      return;
    }
    fetchMyTrips()
      .then(setTrips)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <StoreFront wide>
      <div className="wg-platform">
        <AccountSubnav />
        <h1>🧳 رحلاتي</h1>
        <p className="lead">كل حجوزاتك في مكان واحد — تذاكر، vouchers، فاتورة، وبرنامج يومي.</p>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "grid", gap: "1rem" }}>
          {trips.map((trip) => (
            <article key={trip.id} className="wg-platform-card">
              <div className="body">
                <h2>{trip.title}</h2>
                <p style={{ margin: 0, color: "#64748b" }}>
                  {trip.destination} · {trip.startDate} → {trip.endDate}
                </p>
                <p style={{ margin: 0 }}>
                  ✈️ Flight {STATUS_AR[trip.services.flight]} · 🏨 Hotel {STATUS_AR[trip.services.hotel]} · 🚗
                  Transfer {STATUS_AR[trip.services.transfer]} · 🎯 Activities{" "}
                  {STATUS_AR[trip.services.activity]}
                </p>
                <p style={{ margin: 0, fontWeight: 700 }}>
                  {formatKwdMinor(trip.totalMinor, trip.currency)} · {trip.paymentStatus}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
                  {trip.documents.ticketUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.ticketUrl}>
                      التذكرة
                    </Link>
                  ) : null}
                  {trip.documents.hotelVoucherUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.hotelVoucherUrl}>
                      Voucher فندق
                    </Link>
                  ) : null}
                  {trip.documents.transferVoucherUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.transferVoucherUrl}>
                      Voucher نقل
                    </Link>
                  ) : null}
                  {trip.documents.activityVoucherUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.activityVoucherUrl}>
                      Voucher أنشطة
                    </Link>
                  ) : null}
                  {trip.documents.invoiceUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.invoiceUrl}>
                      الفاتورة
                    </Link>
                  ) : null}
                  {trip.documents.itineraryUrl ? (
                    <Link className="wg-btn secondary" href={trip.documents.itineraryUrl}>
                      البرنامج اليومي
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
          {!trips.length && !error ? <p>لا توجد رحلات بعد — ابدأ من Trip Builder أو العروض.</p> : null}
        </div>
      </div>
    </StoreFront>
  );
}
