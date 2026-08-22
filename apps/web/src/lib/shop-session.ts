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
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearShopSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export async function shopFetch<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number; auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getShopToken();
  if (token && init.auth !== false) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const { timeoutMs = 20000, auth: _auth, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${getShopApiUrl()}${path}`, {
      ...rest,
      headers,
      signal: rest.signal || controller.signal,
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
