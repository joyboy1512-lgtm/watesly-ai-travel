"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "../../shop.css";
import { StoreFront } from "@/components/shop/StoreFront";
import { saveShopSession, shopFetch } from "@/lib/shop-session";
import { unlockShopCustomer, verifyShopUnlock } from "@/lib/shop-unlock";
import { safeNextPath } from "@/lib/safe-next-path";
import { useShopI18n } from "@/components/shop/ShopI18nProvider";

type Mode = "unlock" | "password" | "reset";

export default function ShopLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [mode, setMode] = useState<Mode>("unlock");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "reset") {
        if (!needsCode) {
          const result = await shopFetch<{
            ok: boolean;
            delivery?: string;
            message?: string;
          }>("/shop/password-reset/request", {
            method: "POST",
            body: JSON.stringify({ phone }),
          });
          setNeedsCode(true);
          setInfo(result.message || "RESET_SENT");
          return;
        }
        if (password !== confirm) {
          setError("PASSWORD_MISMATCH");
          return;
        }
        const result = await shopFetch<{
          accessToken: string;
          customer: {
            id: string;
            phone: string;
            email: string | null;
            name: string | null;
            status: string;
          };
        }>("/shop/password-reset/confirm", {
          method: "POST",
          body: JSON.stringify({ phone, code, password }),
        });
        saveShopSession({
          accessToken: result.accessToken,
          customer: result.customer,
        });
        router.replace("/account");
        return;
      }

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
        confirm={confirm}
        code={code}
        needsCode={needsCode}
        mode={mode}
        error={error}
        info={info}
        busy={busy}
        setPhone={setPhone}
        setName={setName}
        setPassword={setPassword}
        setConfirm={setConfirm}
        setCode={setCode}
        setMode={(next) => {
          setMode(next);
          setNeedsCode(false);
          setCode("");
          setPassword("");
          setConfirm("");
          setError("");
          setInfo("");
        }}
        onSubmit={onSubmit}
      />
    </StoreFront>
  );
}

function ShopLoginForm({
  phone,
  name,
  password,
  confirm,
  code,
  needsCode,
  mode,
  error,
  info,
  busy,
  setPhone,
  setName,
  setPassword,
  setConfirm,
  setCode,
  setMode,
  onSubmit,
}: {
  phone: string;
  name: string;
  password: string;
  confirm: string;
  code: string;
  needsCode: boolean;
  mode: Mode;
  error: string;
  info: string;
  busy: boolean;
  setPhone: (v: string) => void;
  setName: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirm: (v: string) => void;
  setCode: (v: string) => void;
  setMode: (v: Mode) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t } = useShopI18n();
  const submitLabel =
    mode === "reset"
      ? needsCode
        ? t("resetCta")
        : t("sendResetCode")
      : needsCode
        ? t("confirmCode")
        : t("navLogin");

  return (
    <>
      <header className="shop-inner-hero">
        <div className="shop-inner-hero-inner">
          <h1>{mode === "reset" ? t("resetPasswordTitle") : t("customerLogin")}</h1>
          <p>{mode === "reset" ? t("resetPasswordHint") : t("loginHint")}</p>
        </div>
      </header>
      <section className="shop-panel">
        {error ? (
          <p className="shop-error">
            {error === "LOGIN_FAILED"
              ? t("loginFailed")
              : error === "PASSWORD_MISMATCH"
                ? t("passwordMismatch")
                : error}
          </p>
        ) : null}
        {info ? (
          <p className="shop-ok">{info === "RESET_SENT" ? t("resetSent") : info}</p>
        ) : null}
        {mode !== "reset" ? (
          <div className="shop-chips">
            <button
              type="button"
              className={mode === "unlock" ? "on" : undefined}
              onClick={() => setMode("unlock")}
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
        ) : null}
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
              disabled={needsCode && mode !== "reset"}
            />
          </label>
          {(mode === "unlock" && needsCode) || (mode === "reset" && needsCode) ? (
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
          {mode === "reset" && needsCode ? (
            <>
              <label>
                {t("newPassword")}
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
            </>
          ) : null}
          <button className="shop-btn" type="submit" disabled={busy}>
            {busy ? "..." : submitLabel}
          </button>
        </form>
        <p className="shop-auth-switch">
          <a href="/account/register">{t("needAccount")}</a>
          {mode === "reset" ? (
            <button type="button" className="shop-linkbtn" onClick={() => setMode("password")}>
              {t("navLogin")}
            </button>
          ) : (
            <button type="button" className="shop-linkbtn" onClick={() => setMode("reset")}>
              {t("forgotPassword")}
            </button>
          )}
        </p>
      </section>
    </>
  );
}
