/**
 * Shared key-value: Redis when REDIS_URL is set, else process-local Map.
 * Minimal RESP client — no new dependency. Falls back to memory on Redis errors.
 */
import { createConnection, type Socket } from "net";
import { URL } from "url";

type MemEntry = { value: string; expiresAt: number | null };
const memory = new Map<string, MemEntry>();

function memGet(key: string): string | null {
  const row = memory.get(key);
  if (!row) return null;
  if (row.expiresAt != null && row.expiresAt < Date.now()) {
    memory.delete(key);
    return null;
  }
  return row.value;
}

function memSet(key: string, value: string, ttlMs?: number): void {
  memory.set(key, {
    value,
    expiresAt: ttlMs && ttlMs > 0 ? Date.now() + ttlMs : null,
  });
}

function memDel(key: string): void {
  memory.delete(key);
}

function redisUrl(): string | null {
  return process.env.REDIS_URL?.trim() || null;
}

function encodeResp(args: string[]): Buffer {
  let out = `*${args.length}\r\n`;
  for (const a of args) {
    const b = Buffer.from(String(a), "utf8");
    out += `$${b.length}\r\n${a}\r\n`;
  }
  return Buffer.from(out, "utf8");
}

type RedisReply = string | null | number;

function readReply(buf: Buffer, offset: number): { value: RedisReply; next: number } {
  const text = buf.toString("utf8", offset);
  const kind = text[0];
  if (kind === "+") {
    const end = text.indexOf("\r\n");
    if (end < 0) throw new Error("incomplete");
    return { value: text.slice(1, end), next: offset + end + 2 };
  }
  if (kind === "-") {
    const end = text.indexOf("\r\n");
    if (end < 0) throw new Error("incomplete");
    throw new Error(text.slice(1, end));
  }
  if (kind === ":") {
    const end = text.indexOf("\r\n");
    if (end < 0) throw new Error("incomplete");
    return { value: Number(text.slice(1, end)), next: offset + end + 2 };
  }
  if (kind === "$") {
    const end = text.indexOf("\r\n");
    if (end < 0) throw new Error("incomplete");
    const len = Number(text.slice(1, end));
    if (len < 0) return { value: null, next: offset + end + 2 };
    const start = end + 2;
    const dataEnd = start + len;
    if (text.length < dataEnd + 2) throw new Error("incomplete");
    return {
      value: text.slice(start, dataEnd),
      next: offset + dataEnd + 2,
    };
  }
  throw new Error("bad redis reply");
}

async function withRedis<T>(
  fn: (send: (args: string[]) => Promise<RedisReply>) => Promise<T>,
): Promise<T> {
  const urlRaw = redisUrl();
  if (!urlRaw) throw new Error("no redis");
  const u = new URL(urlRaw);
  const host = u.hostname || "127.0.0.1";
  const port = Number(u.port || 6379);
  const password = u.password ? decodeURIComponent(u.password) : undefined;
  const db = u.pathname && u.pathname !== "/" ? Number(u.pathname.slice(1)) : 0;

  return new Promise<T>((resolve, reject) => {
    const socket: Socket = createConnection({ host, port });
    let buf = Buffer.alloc(0);
    let pending: { resolve: (v: RedisReply) => void; reject: (e: Error) => void } | null =
      null;
    let closed = false;
    const timer = setTimeout(() => cleanup(new Error("redis timeout")), 1500);

    const cleanup = (err?: Error) => {
      if (closed) return;
      closed = true;
      clearTimeout(timer);
      socket.destroy();
      if (err) reject(err);
    };

    const pump = () => {
      if (!pending) return;
      try {
        const { value, next } = readReply(buf, 0);
        buf = buf.subarray(next);
        const p = pending;
        pending = null;
        p.resolve(value);
      } catch (e) {
        if ((e as Error).message === "incomplete") return;
        pending.reject(e as Error);
        pending = null;
        cleanup(e as Error);
      }
    };

    const send = (args: string[]) =>
      new Promise<RedisReply>((res, rej) => {
        if (closed) return rej(new Error("redis closed"));
        pending = { resolve: res, reject: rej };
        socket.write(encodeResp(args));
      });

    socket.on("error", (e) => cleanup(e));
    socket.on("connect", () => {
      void (async () => {
        try {
          if (password) await send(["AUTH", password]);
          if (db) await send(["SELECT", String(db)]);
          const result = await fn(send);
          cleanup();
          resolve(result);
        } catch (e) {
          cleanup(e as Error);
        }
      })();
    });
    socket.on("data", (d) => {
      buf = Buffer.concat([buf, d]);
      pump();
    });
  });
}

export async function sharedGet(key: string): Promise<string | null> {
  if (!redisUrl()) return memGet(key);
  try {
    const v = await withRedis((send) => send(["GET", key]));
    return typeof v === "string" ? v : null;
  } catch {
    return memGet(key);
  }
}

export async function sharedSet(
  key: string,
  value: string,
  ttlMs?: number,
): Promise<void> {
  memSet(key, value, ttlMs);
  if (!redisUrl()) return;
  try {
    await withRedis((send) =>
      ttlMs && ttlMs > 0
        ? send(["SET", key, value, "PX", String(Math.ceil(ttlMs))])
        : send(["SET", key, value]),
    );
  } catch {
    // memory already set
  }
}

export async function sharedSetNx(
  key: string,
  value: string,
  ttlMs?: number,
): Promise<boolean> {
  if (!redisUrl()) {
    if (memGet(key) != null) return false;
    memSet(key, value, ttlMs);
    return true;
  }
  try {
    const v = await withRedis((send) =>
      ttlMs && ttlMs > 0
        ? send(["SET", key, value, "PX", String(Math.ceil(ttlMs)), "NX"])
        : send(["SET", key, value, "NX"]),
    );
    if (v === "OK") {
      memSet(key, value, ttlMs);
      return true;
    }
    return false;
  } catch {
    if (memGet(key) != null) return false;
    memSet(key, value, ttlMs);
    return true;
  }
}

export async function sharedDelete(key: string): Promise<void> {
  memDel(key);
  if (!redisUrl()) return;
  try {
    await withRedis((send) => send(["DEL", key]));
  } catch {
    // ignore
  }
}

export async function sharedIncr(key: string, ttlMs: number): Promise<number> {
  if (!redisUrl()) {
    const existing = memory.get(key);
    const cur = Number(memGet(key) || "0") + 1;
    const expiresAt =
      existing?.expiresAt && existing.expiresAt > Date.now()
        ? existing.expiresAt
        : Date.now() + ttlMs;
    memory.set(key, { value: String(cur), expiresAt });
    return cur;
  }
  try {
    return await withRedis(async (send) => {
      const n = await send(["INCR", key]);
      const count = typeof n === "number" ? n : Number(n);
      if (count === 1) {
        await send(["PEXPIRE", key, String(Math.ceil(ttlMs))]);
      }
      return count;
    });
  } catch {
    const existing = memory.get(key);
    const cur = Number(memGet(key) || "0") + 1;
    const expiresAt =
      existing?.expiresAt && existing.expiresAt > Date.now()
        ? existing.expiresAt
        : Date.now() + ttlMs;
    memory.set(key, { value: String(cur), expiresAt });
    return cur;
  }
}

export async function sharedGetJson<T>(key: string): Promise<T | null> {
  const raw = await sharedGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function sharedSetJson(
  key: string,
  value: unknown,
  ttlMs?: number,
): Promise<void> {
  await sharedSet(key, JSON.stringify(value), ttlMs);
}

export async function sharedSetNxJson(
  key: string,
  value: unknown,
  ttlMs?: number,
): Promise<boolean> {
  return sharedSetNx(key, JSON.stringify(value), ttlMs);
}

export function resetSharedKvMemoryForTests() {
  memory.clear();
}
