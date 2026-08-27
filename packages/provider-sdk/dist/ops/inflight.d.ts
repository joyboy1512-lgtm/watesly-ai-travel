/** Deduplicate identical concurrent async work (singleflight). */
export declare function singleflight<T>(key: string, run: () => Promise<T>): Promise<T>;
export declare function clearInflightForTests(): void;
//# sourceMappingURL=inflight.d.ts.map