"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import "../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { formatMoneyMinor } from "@/lib/format";
import {
  clearShopSession,
  getShopSession,
  shopFetch,
} from "@/lib/shop-session";
import { PassportScanField } from "@/components/shop/PassportScanField";
import { isoDate } from "@/lib/family-travelers";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

type Traveler = {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  nationality?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
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

const emptyFamily = {
  title: "mr",
  firstName: "",
  lastName: "",
  birthDate: "",
  nationality: "KW",
  passportNumber: "",
  passportExpiry: "",
  relation: "family",
};

export default function AccountPage() {
  const { t } = useShopI18n();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [form, setForm] = useState(emptyFamily);
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
      setOk(t("profileSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    }
  }

  async function addFamily(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const row = await shopFetch<Traveler>("/shop/travelers", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          firstName: form.firstName,
          lastName: form.lastName,
          birthDate: form.birthDate || undefined,
          nationality: form.nationality || undefined,
          passportNumber: form.passportNumber || undefined,
          passportExpiry: form.passportExpiry || undefined,
          relation: form.relation || "family",
        }),
      });
      setTravelers((prev) => [...prev, row]);
      setForm(emptyFamily);
      setOk(t("familySaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("addTravelerFailed"));
    }
  }

  if (!ready) {
    return (
      <StoreFront>
        <p>{t("loading")}</p>
      </StoreFront>
    );
  }

  return (
    <StoreFront>
      <section className="shop-panel">
        <h1>{t("navAccount")}</h1>
        {error ? <p className="shop-error">{error}</p> : null}
        {ok ? <p className="shop-ok">{ok}</p> : null}
        <form className="shop-form" onSubmit={saveProfile}>
          <p className="shop-hint">
            {t("mobile")}: {phone}
          </p>
          <label>
            {t("name")}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            {t("emailOptional")}
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className="shop-btn" type="submit">
            {t("saveChanges")}
          </button>
        </form>
      </section>

      <section className="shop-panel" style={{ marginTop: "1rem" }}>
        <h2>{t("familyList")}</h2>
        <p className="shop-hint">{t("familySaveHint")}</p>
        <div className="shop-list">
          {travelers.map((row) => (
            <article key={row.id}>
              <div>
                <strong>
                  {row.firstName} {row.lastName}
                </strong>
                <p className="shop-hint">
                  {[
                    row.relation || t("travelers"),
                    isoDate(row.birthDate),
                    row.nationality,
                    row.passportNumber,
                    isoDate(row.passportExpiry)
                      ? `${t("passportExpiry")} ${isoDate(row.passportExpiry)}`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="shop-btn-ghost"
                onClick={() =>
                  shopFetch(`/shop/travelers/${row.id}`, { method: "DELETE" })
                    .then(() =>
                      setTravelers((prev) => prev.filter((item) => item.id !== row.id)),
                    )
                    .catch((err: Error) => setError(err.message))
                }
              >
                {t("delete")}
              </button>
            </article>
          ))}
          {travelers.length === 0 ? <p>{t("noFamilyYet")}</p> : null}
        </div>

        <form className="shop-form shop-family-form" onSubmit={addFamily}>
          <PassportScanField
            onFields={(fields) =>
              setForm((prev) => ({
                ...prev,
                title: fields.title || prev.title,
                firstName: fields.firstName || prev.firstName,
                lastName: fields.lastName || prev.lastName,
                birthDate: fields.birthDate || prev.birthDate,
                nationality: fields.nationality || prev.nationality,
                passportNumber: fields.passportNumber || prev.passportNumber,
                passportExpiry: fields.passportExpiry || prev.passportExpiry,
              }))
            }
          />
          <div className="shop-form-row">
            <label>
              {t("firstName")}
              <input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                required
              />
            </label>
            <label>
              {t("lastName")}
              <input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                required
              />
            </label>
          </div>
          <div className="shop-form-row">
            <label>
              {t("birthDate")}
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
              />
            </label>
            <label>
              {t("nationality")}
              <input
                value={form.nationality}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    nationality: e.target.value.toUpperCase().slice(0, 3),
                  }))
                }
                maxLength={3}
              />
            </label>
          </div>
          <div className="shop-form-row">
            <label>
              {t("passportNumber")}
              <input
                value={form.passportNumber}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    passportNumber: e.target.value.replace(/\s+/g, "").toUpperCase(),
                  }))
                }
              />
            </label>
            <label>
              {t("passportExpiry")}
              <input
                type="date"
                value={form.passportExpiry}
                onChange={(e) => setForm((p) => ({ ...p, passportExpiry: e.target.value }))}
              />
            </label>
          </div>
          <label>
            {t("relation")}
            <input
              value={form.relation}
              onChange={(e) => setForm((p) => ({ ...p, relation: e.target.value }))}
            />
          </label>
          <button className="shop-btn" type="submit">
            {t("addFamilyMember")}
          </button>
        </form>
      </section>

      <section className="shop-panel" style={{ marginTop: "1rem" }}>
        <h2>{t("navMyBookings")}</h2>
        <div className="shop-list">
          {bookings.map((row) => (
            <article key={row.id}>
              <div>
                <strong>{row.description}</strong>
                <p className="shop-hint">
                  {row.serviceType || t("booking")} · {row.status} ·{" "}
                  {row.paymentStatus === "unpaid" ? t("unpaid") : row.paymentStatus}
                </p>
              </div>
              <strong>{formatMoneyMinor(row.totalSellAmount, row.currency)}</strong>
            </article>
          ))}
          {bookings.length === 0 ? <p>{t("noBookingsYet")}</p> : null}
        </div>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/">{t("bookNewTrip")}</Link>
          {" · "}
          <button
            type="button"
            className="shop-linkbtn"
            onClick={() => {
              clearShopSession();
              window.location.href = "/";
            }}
          >
            {t("navLogout")}
          </button>
        </p>
      </section>
    </StoreFront>
  );
}
