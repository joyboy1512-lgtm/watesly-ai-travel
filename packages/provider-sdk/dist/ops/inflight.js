"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.singleflight = singleflight;
exports.clearInflightForTests = clearInflightForTests;
const inflight = new Map();
/** Deduplicate identical concurrent async work (singleflight). */
function singleflight(key, run) {
    const existing = inflight.get(key);
    if (existing)
        return existing;
    const promise = Promise.resolve()
        .then(run)
        .finally(() => {
        if (inflight.get(key) === promise)
            inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
}
function clearInflightForTests() {
    inflight.clear();
}
//# sourceMappingURL=inflight.js.map