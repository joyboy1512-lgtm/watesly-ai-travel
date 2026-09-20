import { HttpException, HttpStatus } from "@nestjs/common";
import { sharedDecr, sharedIncrStrict } from "./shared-kv";

const SLOT_KEY = "shop:search:inflight";

export function searchMaxInflight() {
  const n = Number(process.env.SEARCH_MAX_INFLIGHT || 40);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

export function searchSlotTtlMs() {
  const n = Number(process.env.SEARCH_SLOT_TTL_MS || 45_000);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 45_000;
}

export async function tryAcquireSearchSlot(): Promise<boolean> {
  const max = searchMaxInflight();
  const count = await sharedIncrStrict(SLOT_KEY, searchSlotTtlMs());
  if (count > max) {
    await sharedDecr(SLOT_KEY);
    return false;
  }
  return true;
}

export async function releaseSearchSlot(): Promise<void> {
  await sharedDecr(SLOT_KEY);
}

function logSearch(fields: Record<string, unknown>) {
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      kind: "shop.search",
      ...fields,
      at: new Date().toISOString(),
    }),
  );
}

/** Capacity gate + timing only. Does not cache or alter search results. */
export async function guardShopSearch<T>(
  service: string,
  run: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  const allowed = await tryAcquireSearchSlot();
  if (!allowed) {
    logSearch({ service, status: "shed", ms: Date.now() - started });
    throw new HttpException("طلبات كثيرة، حاول لاحقًا", HttpStatus.TOO_MANY_REQUESTS);
  }
  try {
    const result = await run();
    logSearch({ service, status: "ok", ms: Date.now() - started });
    return result;
  } catch (err) {
    logSearch({
      service,
      status: "error",
      ms: Date.now() - started,
      error: err instanceof Error ? err.message.slice(0, 160) : "error",
    });
    throw err;
  } finally {
    await releaseSearchSlot();
  }
}
