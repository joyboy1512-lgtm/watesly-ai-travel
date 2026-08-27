export type CircuitState = "closed" | "open" | "half_open";
export type CircuitBreakerOptions = {
    failureThreshold?: number;
    /** ms to stay open before allowing a probe */
    resetMs?: number;
    name?: string;
};
export declare class CircuitBreaker {
    private failures;
    private openedAt;
    private halfOpenInFlight;
    private readonly failureThreshold;
    private readonly resetMs;
    readonly name: string;
    constructor(opts?: CircuitBreakerOptions);
    get state(): CircuitState;
    allow(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
}
//# sourceMappingURL=circuit-breaker.d.ts.map