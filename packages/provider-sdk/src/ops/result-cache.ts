/**
 * Optional shared cache for raw provider search results.
 * Process-local by default; API binds Redis so PM2 workers share hits.
 * Pricing and inquiry creation stay on the normal search path.
 */

type RemoteCache = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
};

const memory = new Map<string, { raw: string; exp: number }>();
let remote: RemoteCache | null = null;

export function bindProviderResultCache(store: RemoteCache | null) {
  remote = store;
}

export function clearProviderResultCacheForTests() {
  memory.clear();
}

export async function readProviderResultCache<T>(key: string): Promise<T | null> {
  const now = Date.now();
  const local = memory.get(key);
  if (local && local.exp > now) {
    try {
      return JSON.parse(local.raw) as T;
    } catch {
      memory.delete(key);
    }
  }
  if (!remote) return null;
  try {
    const raw = await remote.get(key);
    if (!raw) return null;
    memory.set(key, { raw, exp: now + 60_000 });
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeProviderResultCache(
  key: string,
  value: unknown,
  ttlMs: number,
): Promise<void> {
  const raw = JSON.stringify(value);
  memory.set(key, { raw, exp: Date.now() + ttlMs });
  if (memory.size > 80) {
    const oldest = [...memory.entries()].sort((a, b) => a[1].exp - b[1].exp)[0];
    if (oldest) memory.delete(oldest[0]);
  }
  if (!remote) return;
  try {
    await remote.set(key, raw, ttlMs);
  } catch {
    // keep the in-process copy
  }
}
