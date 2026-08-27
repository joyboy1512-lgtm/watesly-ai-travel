/** Known travel provider adapters available in the platform. */
export type ProviderCapability = "flight" | "hotel" | "transfer" | "activity";
export type ProviderCredentialField = {
    key: string;
    label: string;
    secret?: boolean;
    required?: boolean;
    placeholder?: string;
};
export type ProviderCatalogEntry = {
    providerKey: string;
    displayName: string;
    displayNameAr: string;
    description: string;
    capabilities: ProviderCapability[];
    status: "live" | "ready" | "scaffold";
    /** Env vars that activate this provider globally */
    envKeys: string[];
    credentialFields: ProviderCredentialField[];
    notes?: string;
};
export declare const PROVIDER_CATALOG: ProviderCatalogEntry[];
export declare function getCatalogEntry(providerKey: string): ProviderCatalogEntry | null;
//# sourceMappingURL=catalog.d.ts.map