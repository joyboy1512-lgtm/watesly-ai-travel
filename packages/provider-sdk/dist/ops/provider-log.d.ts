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
export declare function logProviderOps(fields: OpsLogFields): void;
export declare function newRequestId(): string;
//# sourceMappingURL=provider-log.d.ts.map