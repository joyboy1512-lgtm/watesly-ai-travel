import { HttpException, HttpStatus } from "@nestjs/common";
import { postBeeceptorDebug } from "./beeceptor-debug";
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
    const ms = Date.now() - started;
    logSearch({ service, status: "shed", ms });
    postBeeceptorDebug("/debug/shop-search", { service, status: "shed", ms });
    throw new HttpException("طلبات كثيرة، حاول لاحقًا", HttpStatus.TOO_MANY_REQUESTS);
  }
  try {
    const result = await run();
    const ms = Date.now() - started;
    logSearch({ service, status: "ok", ms });
    postBeeceptorDebug("/debug/shop-search", { service, status: "ok", ms });
    return result;
  } catch (err) {
    const ms = Date.now() - started;
    const error = err instanceof Error ? err.message.slice(0, 160) : "error";
    logSearch({ service, status: "error", ms, error });
    postBeeceptorDebug("/debug/shop-search", { service, status: "error", ms, error });
    throw err;
  } finally {
    await releaseSearchSlot();
  }
}
