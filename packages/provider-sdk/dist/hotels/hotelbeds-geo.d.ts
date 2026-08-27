export type GeoCenter = {
    latitude: number;
    longitude: number;
    label?: string;
};
export type PointOfInterest = {
    name: string;
    nameAr: string;
    latitude: number;
    longitude: number;
};
export declare function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare function formatDistanceKm(km: number): string;
export declare function resolvePois(destinationCode?: string, label?: string): PointOfInterest[];
export declare function buildDistanceInfo(input: {
    hotelLat?: number;
    hotelLng?: number;
    center: GeoCenter;
    destinationCode?: string;
    label?: string;
}): {
    distanceToCenterKm: undefined;
    distanceToCenterLabel: undefined;
    poiDistances: Array<{
        nameAr: string;
        km: number;
        label: string;
    }>;
} | {
    distanceToCenterKm: number;
    distanceToCenterLabel: string;
    poiDistances: {
        nameAr: string;
        km: number;
        label: string;
    }[];
};
//# sourceMappingURL=hotelbeds-geo.d.ts.map