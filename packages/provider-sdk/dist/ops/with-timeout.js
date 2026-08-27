"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anySignal = anySignal;
exports.withTimeoutSignal = withTimeoutSignal;
function anySignal(...signals) {
    const list = signals.filter(Boolean);
    if (list.length === 0)
        return new AbortController().signal;
    if (list.length === 1)
        return list[0];
    if (typeof AbortSignal.any === "function")
        return AbortSignal.any(list);
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
function withTimeoutSignal(timeoutMs, external) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const signal = anySignal(controller.signal, external);
    return {
        signal,
        clear: () => clearTimeout(timer),
    };
}
//# sourceMappingURL=with-timeout.js.map