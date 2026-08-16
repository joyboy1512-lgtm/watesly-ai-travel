const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type AuthSession = {
  accessToken: string;
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string };
  role: { code: string };
  permissions: string[];
};

const TOKEN_KEY = "watesly_travel_token";
const SESSION_KEY = "watesly_travel_session";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

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

/** Multipart upload helper — do not set Content-Type (browser sets boundary). */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    ...init,
    headers,
    body: formData,
  });

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

export async function loginRequest(email: string, password: string) {
  return apiFetch<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(input: {
  organizationName: string;
  organizationSlug: string;
  ownerName: string;
  email: string;
  password: string;
}) {
  return apiFetch<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
