"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { saveShopSession, shopFetch } from "@/lib/shop-session";
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import { safeNextPath } from "@/lib/safe-next-path";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

export default function ShopLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [mode, setMode] = useState<"unlock" | "password">("unlock");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "password") {
        const result = await shopFetch<{
          accessToken: string;
          customer: {
            id: string;
            phone: string;
            email: string | null;
            name: string | null;
            status: string;
          };
        }>("/shop/login", {
          method: "POST",
          body: JSON.stringify({ phone, password }),
        });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        router.replace(safeNextPath("/account", "/account"));
        return;
      }

      if (needsCode) {
        const result = await verifyShopUnlock({ phone, name, code });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        router.replace("/account");
        return;
      }

      const result = await unlockShopCustomer({ phone, name });
      if (result.needsCode) {
        setNeedsCode(true);
        if (result.debugCode) setCode(result.debugCode);
        return;
      }
      saveShopSession({
        accessToken: result.accessToken,
        customer: result.customer,
      });
      router.replace("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "LOGIN_FAILED");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StoreFront>
      <ShopLoginForm
        phone={phone}
        name={name}
        password={password}
        code={code}
        needsCode={needsCode}
        mode={mode}
        error={error}
        busy={busy}
        setPhone={setPhone}
        setName={setName}
        setPassword={setPassword}
        setCode={setCode}
        setNeedsCode={setNeedsCode}
        setMode={setMode}
        onSubmit={onSubmit}
      />
    </StoreFront>
  );
}

function ShopLoginForm({
  phone,
  name,
  password,
  code,
  needsCode,
  mode,
  error,
  busy,
  setPhone,
  setName,
  setPassword,
  setCode,
  setNeedsCode,
  setMode,
  onSubmit,
}: {
  phone: string;
  name: string;
  password: string;
  code: string;
  needsCode: boolean;
  mode: "unlock" | "password";
  error: string;
  busy: boolean;
  setPhone: (v: string) => void;
  setName: (v: string) => void;
  setPassword: (v: string) => void;
  setCode: (v: string) => void;
  setNeedsCode: (v: boolean) => void;
  setMode: (v: "unlock" | "password") => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t } = useShopI18n();
  return (
      <section className="shop-panel">
        <h1>{t("customerLogin")}</h1>
        <p className="shop-hint">{t("loginHint")}</p>
        {error ? (
          <p className="shop-error">{error === "LOGIN_FAILED" ? t("loginFailed") : error}</p>
        ) : null}
        <div className="shop-chips">
          <button
            type="button"
            className={mode === "unlock" ? "on" : undefined}
            onClick={() => {
              setMode("unlock");
              setNeedsCode(false);
              setCode("");
            }}
          >
            {t("byMobile")}
          </button>
          <button
            type="button"
            className={mode === "password" ? "on" : undefined}
            onClick={() => setMode("password")}
          >
            {t("byPassword")}
          </button>
        </div>
        <form className="shop-form" onSubmit={onSubmit}>
          {mode === "unlock" ? (
            <label>
              {t("name")}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          ) : null}
          <label>
            {t("mobile")}
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="965xxxxxxxx"
              disabled={needsCode}
            />
          </label>
          {mode === "unlock" && needsCode ? (
            <label>
              {t("otpCode")}
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t("otpPlaceholder")}
              />
            </label>
          ) : null}
          {mode === "password" ? (
            <label>
              {t("password")}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          ) : null}
          <button className="shop-btn" type="submit" disabled={busy}>
            {busy ? "..." : needsCode ? t("confirmCode") : t("navLogin")}
          </button>
        </form>
      </section>
  );
}
