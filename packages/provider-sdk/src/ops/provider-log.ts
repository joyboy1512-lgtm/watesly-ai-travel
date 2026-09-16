export type OpsLogStatus = "ok" | "error" | "timeout" | "circuit_open" | "cache_hit";

export type OpsLogFields = {
  requestId?: string;
  provider: string;
  operation: string;
  durationMs: number;
  status: OpsLogStatus;
  errorCode?: string;
  retryCount?: number;
};

/** Structured provider ops log — never pass PII or secrets. */
export function logProviderOps(fields: OpsLogFields): void {
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
  } else {
    console.warn(JSON.stringify(line));
  }
}

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
