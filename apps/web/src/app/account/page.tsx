"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import "../shop.css";
import "../platform.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { AccountSubnav } from "@/components/platform/AccountSubnav";
import { formatMoneyMinor } from "@/lib/format";
import {
  clearShopSession,
  getShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { isPlatformEnabled } from "@watesly-travel/shared";

type Traveler = {
  id: string;
  firstName: string;
  lastName: string;
  relation?: string | null;
};

type BookingRow = {
  id: string;
  status: string;
  createdAt: string;
  totalSellAmount: number;
  currency: string;
  description: string;
  serviceType?: string;
  paymentStatus?: string;
};

export default function AccountPage() {
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!getShopSession()) {
      window.location.replace("/account/login");
      return;
    }
    Promise.all([
      shopFetch<{
        customer: { name: string | null; email: string | null; phone: string };
        travelers: Traveler[];
      }>("/shop/me"),
      shopFetch<BookingRow[]>("/shop/bookings"),
    ])
      .then(([me, rows]) => {
        setName(me.customer.name || "");
        setEmail(me.customer.email || "");
        setPhone(me.customer.phone);
        setTravelers(me.travelers || []);
        setBookings(rows || []);
        setReady(true);
      })
      .catch((err: Error) => {
        setError(err.message);
        setReady(true);
      });
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await shopFetch("/shop/me", {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      setOk("تم حفظ الملف");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر الحفظ");
    }
  }

  async function addFamily(e: FormEvent) {
    e.preventDefault();
    try {
      const row = await shopFetch<Traveler>("/shop/travelers", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, relation: "family" }),
      });
      setTravelers((prev) => [...prev, row]);
      setFirstName("");
      setLastName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر إضافة المسافر");
    }
  }

  if (!ready) {
    return (
      <StoreFront>
        <p>جارٍ التحميل...</p>
      </StoreFront>
    );
  }

  return (
    <StoreFront>
      {isPlatformEnabled() ? (
        <div className="wg-platform" style={{ paddingBottom: 0 }}>
          <AccountSubnav />
        </div>
      ) : null}
      <section className="shop-panel">
        <h1>حسابي</h1>
        {error ? <p className="shop-error">{error}</p> : null}
        {ok ? <p className="shop-ok">{ok}</p> : null}
        <form className="shop-form" onSubmit={saveProfile}>
          <p className="shop-hint">الجوال: {phone}</p>
          <label>
            الاسم
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            البريد
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="shop-btn" type="submit">
            حفظ
          </button>
        </form>
      </section>

      <section className="shop-panel" style={{ marginTop: "1rem" }}>
        <h2>العائلة</h2>
        <div className="shop-list">
          {travelers.map((row) => (
            <article key={row.id}>
              <div>
                <strong>
                  {row.firstName} {row.lastName}
                </strong>
                <p className="shop-hint">{row.relation || "مسافر"}</p>
              </div>
              <button
                type="button"
                className="shop-btn-ghost"
                onClick={() =>
                  shopFetch(`/shop/travelers/${row.id}`, { method: "DELETE" })
                    .then(() =>
                      setTravelers((prev) => prev.filter((t) => t.id !== row.id)),
                    )
                    .catch((err: Error) => setError(err.message))
                }
              >
                حذف
              </button>
            </article>
          ))}
        </div>
        <form className="shop-form-row" onSubmit={addFamily} style={{ marginTop: "0.8rem" }}>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="الاسم الأول"
            required
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="العائلة"
            required
          />
          <button className="shop-btn" type="submit">
            إضافة
          </button>
        </form>
      </section>

      <section className="shop-panel" style={{ marginTop: "1rem" }}>
        <h2>رحلاتي وطلباتي</h2>
        <div className="shop-list">
          {bookings.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.description}</strong>
                <p className="shop-hint">
                  {row.serviceType || "حجز"} · {row.status} ·{" "}
                  {row.paymentStatus === "unpaid" ? "غير مدفوع" : row.paymentStatus}
                </p>
              </div>
              <strong>
                {formatMoneyMinor(row.totalSellAmount, row.currency)}
              </strong>
            </article>
          ))}
          {bookings.length === 0 ? <p>لا توجد طلبات بعد.</p> : null}
        </div>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/">احجز رحلة جديدة</Link>
          {" · "}
          <button
            type="button"
            className="shop-linkbtn"
            style={{ color: "#184a52" }}
            onClick={() => {
              clearShopSession();
              window.location.href = "/";
            }}
          >
            خروج
          </button>
        </p>
      </section>
    </StoreFront>
  );
}
