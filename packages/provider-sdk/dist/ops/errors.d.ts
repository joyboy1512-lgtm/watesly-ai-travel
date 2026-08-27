export declare function isQuotaOrRateLimitError(message: string): boolean;
export declare function isAuthError(message: string): boolean;
/** Transient network/timeout — safe for a single retry. Never quota/auth. */
export declare function isTransientProviderError(err: unknown): boolean;
export declare function providerErrorCode(err: unknown): string;
//# sourceMappingURL=errors.d.ts.map