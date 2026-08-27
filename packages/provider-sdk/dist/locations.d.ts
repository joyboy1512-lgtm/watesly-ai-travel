/** City / airport helpers for hotel geo search (Duffel Stays needs lat/lng). */
export type GeoPoint = {
    latitude: number;
    longitude: number;
    label: string;
};
export declare function resolveGeoLocation(query: string): GeoPoint | null;
/** Primary airport IATA for a city label or known alias (e.g. الكويت → KWI). */
export declare function cityDefaultAirport(query: string): string | null;
export declare function geocodeLocation(query: string): Promise<GeoPoint | null>;
//# sourceMappingURL=locations.d.ts.map