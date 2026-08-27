"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    failures = 0;
    openedAt = 0;
    halfOpenInFlight = false;
    failureThreshold;
    resetMs;
    name;
    constructor(opts = {}) {
        this.failureThreshold = opts.failureThreshold ?? 5;
        this.resetMs = opts.resetMs ?? 60_000;
        this.name = opts.name || "provider";
    }
    get state() {
        if (this.failures < this.failureThreshold)
            return "closed";
        if (Date.now() - this.openedAt >= this.resetMs)
            return "half_open";
        return "open";
    }
    allow() {
        const s = this.state;
        if (s === "closed")
            return true;
        if (s === "open")
            return false;
        if (this.halfOpenInFlight)
            return false;
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
exports.CircuitBreaker = CircuitBreaker;
//# sourceMappingURL=circuit-breaker.js.map