export function anySignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const list = signals.filter(Boolean) as AbortSignal[];
  if (list.length === 0) return new AbortController().signal;
  if (list.length === 1) return list[0]!;
  if (typeof AbortSignal.any === "function") return AbortSignal.any(list);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of list) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export function withTimeoutSignal(
  timeoutMs: number,
  external?: AbortSignal,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = anySignal(controller.signal, external);
  return {
    signal,
    clear: () => clearTimeout(timer),
  };
}
