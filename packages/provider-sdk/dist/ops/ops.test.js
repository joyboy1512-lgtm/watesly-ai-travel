"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const circuit_breaker_1 = require("./circuit-breaker");
const errors_1 = require("./errors");
const inflight_1 = require("./inflight");
(0, node_test_1.describe)("circuit-breaker", () => {
    (0, node_test_1.it)("opens after failures and recovers", () => {
        const c = new circuit_breaker_1.CircuitBreaker({ failureThreshold: 2, resetMs: 10, name: "t" });
        strict_1.default.equal(c.allow(), true);
        c.recordFailure();
        strict_1.default.equal(c.allow(), true);
        c.recordFailure();
        strict_1.default.equal(c.state, "open");
        strict_1.default.equal(c.allow(), false);
    });
});
(0, node_test_1.describe)("errors", () => {
    (0, node_test_1.it)("classifies transient vs quota", () => {
        strict_1.default.equal((0, errors_1.isTransientProviderError)(new Error("timeout")), true);
        strict_1.default.equal((0, errors_1.isTransientProviderError)(new Error("quota has been exceeded")), false);
        strict_1.default.equal((0, errors_1.providerErrorCode)(new Error("CIRCUIT_OPEN")), "CIRCUIT_OPEN");
    });
});
(0, node_test_1.describe)("singleflight", () => {
    (0, node_test_1.it)("dedupes concurrent calls", async () => {
        (0, inflight_1.clearInflightForTests)();
        let runs = 0;
        const a = (0, inflight_1.singleflight)("k", async () => {
            runs += 1;
            await new Promise((r) => setTimeout(r, 20));
            return 7;
        });
        const b = (0, inflight_1.singleflight)("k", async () => {
            runs += 1;
            return 9;
        });
        const [ra, rb] = await Promise.all([a, b]);
        strict_1.default.equal(ra, 7);
        strict_1.default.equal(rb, 7);
        strict_1.default.equal(runs, 1);
    });
});
//# sourceMappingURL=ops.test.js.map