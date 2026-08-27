export declare function anySignal(...signals: Array<AbortSignal | undefined>): AbortSignal;
export declare function withTimeoutSignal(timeoutMs: number, external?: AbortSignal): {
    signal: AbortSignal;
    clear: () => void;
};
//# sourceMappingURL=with-timeout.d.ts.map