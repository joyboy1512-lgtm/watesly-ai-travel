"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logProviderOps = logProviderOps;
exports.newRequestId = newRequestId;
/** Structured provider ops log — never pass PII or secrets. */
function logProviderOps(fields) {
    const line = {
        kind: "provider_ops",
        requestId: fields.requestId || undefined,
        provider: fields.provider,
        operation: fields.operation,
        durationMs: Math.max(0, Math.round(fields.durationMs)),
        status: fields.status,
        errorCode: fields.errorCode || undefined,
        retryCount: fields.retryCount ?? 0,
        at: new Date().toISOString(),
    };
    if (fields.status === "ok" || fields.status === "cache_hit") {
        console.info(JSON.stringify(line));
    }
    else {
        console.warn(JSON.stringify(line));
    }
}
function newRequestId() {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
//# sourceMappingURL=provider-log.js.map