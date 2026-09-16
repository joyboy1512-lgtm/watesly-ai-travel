function getShopApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const host = window.location.hostname.toLowerCase();
    if (host === "weekendgate.com" || host.endsWith(".weekendgate.com")) {
      return "https://api.weekendgate.com";
    }
  }

  return "/api";
}

export type ShopCustomer = {
  id: string;
  phone: string;
  email: string | null;
  name: string | null;
  status: string;
  hasPassword?: boolean;
};

export type ShopSession = {
  accessToken: string;
  customer: ShopCustomer;
};

const TOKEN_KEY = "weekendgate_customer_token";
const SESSION_KEY = "weekendgate_customer_session";

export function getShopToken(): string | null {
  if (typeof window === "undefined") return null;
  if (process.env.NEXT_PUBLIC_SHOP_COOKIE_AUTH === "1") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getShopSession(): ShopSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ShopSession;
  } catch {
    return null;
  }
}

export function saveShopSession(session: ShopSession) {
  const cookieAuth = process.env.NEXT_PUBLIC_SHOP_COOKIE_AUTH === "1";
  if (!cookieAuth) {
    localStorage.setItem(TOKEN_KEY, session.accessToken);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(
      cookieAuth
        ? { accessToken: "", customer: session.customer }
        : session,
    ),
  );
}

export function clearShopSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_SHOP_COOKIE_AUTH === "1") {
    void fetch(`${getShopApiUrl()}/shop/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token":
          document.cookie
            .split(";")
            .map((p) => p.trim())
            .find((p) => p.startsWith("wg_csrf="))
            ?.slice("wg_csrf=".length) || "",
      },
    }).catch(() => undefined);
  }
}

export async function shopFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number; auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (
    process.env.NEXT_PUBLIC_SHOP_COOKIE_AUTH === "1" &&
    typeof document !== "undefined" &&
    init.method &&
    !["GET", "HEAD"].includes(String(init.method).toUpperCase())
  ) {
    const csrf = document.cookie
      .split(";")
      .map((p) => p.trim())
      .find((p) => p.startsWith("wg_csrf="))
      ?.slice("wg_csrf=".length);
    if (csrf && !headers.has("X-CSRF-Token")) {
      headers.set("X-CSRF-Token", decodeURIComponent(csrf));
    }
  }
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getShopToken();
  if (token && init.auth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { timeoutMs = 20000, auth: _auth, signal: externalSignal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
  }
  let response: Response;
  try {
    response = await fetch(`${getShopApiUrl()}${path}`, {
      ...rest,
      headers,
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    const aborted =
      (err instanceof DOMException && err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError");
    if (aborted) {
      throw new Error("انتهت مهلة الاتصال بالخادم. حدّث الصفحة وحاول مجددًا.");
    }
    throw new Error("تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مجددًا.");
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }

  const data = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (!response.ok) {
    const message = Array.isArray(data.message)
      ? data.message.join("، ")
      : data.message || "حدث خطأ غير متوقع";
    throw new Error(message);
  }
  return data as T;
}
