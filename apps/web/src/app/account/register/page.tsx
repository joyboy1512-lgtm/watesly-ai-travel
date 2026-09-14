"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { saveShopSession, shopFetch } from "@/lib/shop-session";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export default function ShopRegisterPage() {
  return (
    <StoreFront>
      <ShopRegisterForm />
    </StoreFront>
  );
}

function ShopRegisterForm() {
  const router = useRouter();
  const { t } = useShopI18n();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("PASSWORD_MISMATCH");
      return;
    }
    setBusy(true);
    try {
      const result = await shopFetch<{
        accessToken: string;
        customer: {
          id: string;
          phone: string;
          email: string | null;
          name: string | null;
          status: string;
        };
      }>("/shop/register", {
        method: "POST",
        body: JSON.stringify({ name, phone, email, password }),
      });
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      router.replace("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "REGISTER_FAILED");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="shop-inner-hero">
        <div className="shop-inner-hero-inner">
          <h1>{t("createAccount")}</h1>
          <p>{t("registerHint")}</p>
        </div>
      </header>
      <section className="shop-panel">
        {error ? (
          <p className="shop-error">
            {error === "PASSWORD_MISMATCH"
              ? t("passwordMismatch")
              : error === "REGISTER_FAILED"
                ? t("registerFailed")
                : error}
          </p>
        ) : null}
        <form className="shop-form" onSubmit={onSubmit}>
          <label>
            {t("name")}
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            {t("mobile")}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="965xxxxxxxx"
            />
          </label>
          <label>
            {t("emailOptional")}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            {t("password")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label>
            {t("confirmPassword")}
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button className="shop-btn" type="submit" disabled={busy}>
            {busy ? "..." : t("registerCta")}
          </button>
        </form>
        <p className="shop-auth-switch">
          <a href="/account/login">{t("haveAccount")}</a>
        </p>
      </section>
    </>
  );
}
