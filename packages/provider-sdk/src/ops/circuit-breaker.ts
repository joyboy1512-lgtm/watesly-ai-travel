export type CircuitState = "closed" | "open" | "half_open";

export type CircuitBreakerOptions = {
  failureThreshold?: number;
  /** ms to stay open before allowing a probe */
  resetMs?: number;
  name?: string;
};

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private halfOpenInFlight = false;
  private readonly failureThreshold: number;
  private readonly resetMs: number;
  readonly name: string;

  constructor(opts: CircuitBreakerOptions = {}) {
    this.failureThreshold = opts.failureThreshold ?? 5;
    this.resetMs = opts.resetMs ?? 60_000;
    this.name = opts.name || "provider";
  }

  get state(): CircuitState {
    if (this.failures < this.failureThreshold) return "closed";
    if (Date.now() - this.openedAt >= this.resetMs) return "half_open";
    return "open";
  }

  allow(): boolean {
    const s = this.state;
    if (s === "closed") return true;
    if (s === "open") return false;
    if (this.halfOpenInFlight) return false;
    this.halfOpenInFlight = true;
    return true;
  }

  recordSuccess() {
    this.failures = 0;
    this.openedAt = 0;
    this.halfOpenInFlight = false;
  }

  recordFailure() {
    this.failures += 1;
    this.halfOpenInFlight = false;
    if (this.failures >= this.failureThreshold) {
      this.openedAt = Date.now();
    }
  }
}
