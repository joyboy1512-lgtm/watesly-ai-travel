"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.haversineKm = haversineKm;
exports.formatDistanceKm = formatDistanceKm;
exports.resolvePois = resolvePois;
exports.buildDistanceInfo = buildDistanceInfo;
const CITY_POIS = {
    DXB: [
        { name: "Downtown", nameAr: "وسط المدينة (برج خليفة)", latitude: 25.1972, longitude: 55.2744 },
        { name: "Airport", nameAr: "مطار دبي", latitude: 25.2532, longitude: 55.3657 },
        { name: "Marina", nameAr: "دبي مارينا", latitude: 25.0805, longitude: 55.1403 },
        { name: "Mall", nameAr: "دبي مول", latitude: 25.1985, longitude: 55.2796 },
    ],
    AUH: [
        { name: "Center", nameAr: "وسط أبوظبي", latitude: 24.4539, longitude: 54.3773 },
        { name: "Airport", nameAr: "مطار أبوظبي", latitude: 24.433, longitude: 54.6511 },
    ],
    KWI: [
        { name: "Center", nameAr: "وسط الكويت", latitude: 29.3759, longitude: 47.9774 },
        { name: "Airport", nameAr: "مطار الكويت", latitude: 29.2266, longitude: 47.9689 },
    ],
    DOH: [
        { name: "Center", nameAr: "وسط الدوحة", latitude: 25.2854, longitude: 51.531 },
        { name: "Airport", nameAr: "مطار حمد", latitude: 25.2609, longitude: 51.6138 },
    ],
    RUH: [
        { name: "Center", nameAr: "وسط الرياض", latitude: 24.7136, longitude: 46.6753 },
        { name: "Airport", nameAr: "مطار الملك خالد", latitude: 24.9576, longitude: 46.6988 },
    ],
    JED: [
        { name: "Center", nameAr: "وسط جدة", latitude: 21.4858, longitude: 39.1925 },
        { name: "Airport", nameAr: "مطار الملك عبدالعزيز", latitude: 21.6796, longitude: 39.1565 },
    ],
    CAI: [
        { name: "Center", nameAr: "وسط القاهرة", latitude: 30.0444, longitude: 31.2357 },
        { name: "Airport", nameAr: "مطار القاهرة", latitude: 30.1219, longitude: 31.4056 },
    ],
    IST: [
        { name: "Center", nameAr: "وسط إسطنبول", latitude: 41.0082, longitude: 28.9784 },
        { name: "Airport", nameAr: "مطار إسطنبول", latitude: 41.2753, longitude: 28.7519 },
    ],
};
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function formatDistanceKm(km) {
    if (km < 1)
        return `${Math.round(km * 1000)} م`;
    return `${km.toFixed(1)} كم`;
}
function resolvePois(destinationCode, label) {
    const code = (destinationCode || "").toUpperCase();
    if (CITY_POIS[code])
        return CITY_POIS[code];
    const upper = (label || "").toUpperCase();
    for (const [key, pois] of Object.entries(CITY_POIS)) {
        if (upper.includes(key))
            return pois;
    }
    if (label?.includes("دبي"))
        return CITY_POIS.DXB || [];
    if (label?.includes("الكويت"))
        return CITY_POIS.KWI || [];
    return [];
}
function buildDistanceInfo(input) {
    const { hotelLat, hotelLng, center, destinationCode, label } = input;
    if (hotelLat == null || hotelLng == null) {
        return { distanceToCenterKm: undefined, distanceToCenterLabel: undefined, poiDistances: [] };
    }
    const distanceToCenterKm = haversineKm(hotelLat, hotelLng, center.latitude, center.longitude);
    const poiDistances = resolvePois(destinationCode, label).map((poi) => {
        const km = haversineKm(hotelLat, hotelLng, poi.latitude, poi.longitude);
        return { nameAr: poi.nameAr, km, label: formatDistanceKm(km) };
    });
    return {
        distanceToCenterKm,
        distanceToCenterLabel: formatDistanceKm(distanceToCenterKm),
        poiDistances,
    };
}
//# sourceMappingURL=hotelbeds-geo.js.map