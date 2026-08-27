"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomGalleryFor = roomGalleryFor;
exports.enrichDetailsFromContent = enrichDetailsFromContent;
const hotelbeds_geo_1 = require("./hotelbeds-geo");
const hotelbeds_content_client_1 = require("./hotelbeds-content-client");
const FILTER_FACILITY_MAP = {
    wifi: ["70:550", "60:261", "60:100"],
    parking: ["70:200", "70:220", "70:230"],
    pool: ["70:320", "73:10", "73:20"],
    gym: ["70:470"],
    spa: ["70:620", "70:560"],
};
const FALLBACK_LABELS = {
    "70:550": "واي‑فاي",
    "60:261": "واي‑فاي",
    "60:100": "إنترنت",
    "70:70": "مصعد",
    "70:30": "استقبال 24 ساعة",
    "70:40": "خزنة الفندق",
    "70:470": "صالة رياضية",
    "70:320": "مسبح",
    "70:560": "ساونا",
    "70:620": "سبا",
    "60:120": "ميني بار",
    "60:40": "مجفف شعر",
    "60:30": "حوض استحمام",
    "60:20": "دش",
};
function facilityKey(f) {
    return `${f.facilityGroupCode ?? 0}:${f.facilityCode ?? 0}`;
}
function isPresent(f) {
    if (f.indYesOrNo === false || f.indLogic === false)
        return false;
    return true;
}
function mapFacilityLabels(facilities, catalog, withFee = false) {
    const human = [];
    const seen = new Set();
    const filterIds = new Set();
    for (const f of facilities || []) {
        if (!isPresent(f))
            continue;
        const key = facilityKey(f);
        const base = catalog?.get(key) ||
            FALLBACK_LABELS[key] ||
            f.description?.content?.trim();
        if (!base)
            continue;
        const label = withFee && f.indFee ? `${base} (برسوم)` : base;
        if (!seen.has(label)) {
            seen.add(label);
            human.push(label);
        }
        for (const [filterId, keys] of Object.entries(FILTER_FACILITY_MAP)) {
            if (keys.includes(key))
                filterIds.add(filterId);
        }
    }
    return { human, filterIds: [...filterIds] };
}
function mapRoomFacilities(content, roomCode, catalog) {
    const resolved = (0, hotelbeds_content_client_1.resolveContentRoomCode)(content, roomCode) || roomCode;
    const room = content?.rooms?.find((r) => r.roomCode === resolved);
    return mapFacilityLabels(room?.roomFacilities, catalog, true).human.slice(0, 12);
}
function contentRoomOf(content, roomCode) {
    const resolved = (0, hotelbeds_content_client_1.resolveContentRoomCode)(content, roomCode);
    return content?.rooms?.find((r) => r.roomCode === resolved || r.roomCode === roomCode);
}
/** Match gallery URLs to a room code. Never borrow another room's photos. */
function roomGalleryFor(roomGalleries, roomCode, hotelFallback) {
    const resolvedKeys = [
        roomCode,
        roomCode.split("-")[0] || "",
        roomCode.split(".")[0] || "",
    ].filter(Boolean);
    for (const key of resolvedKeys) {
        const list = roomGalleries[key];
        if (list?.length)
            return list;
    }
    // Prefix match against known content room codes only (still same-room family)
    for (const [key, list] of Object.entries(roomGalleries)) {
        if (key === "__hotel__" || !list.length)
            continue;
        if (resolvedKeys.some((rk) => key === rk || key.startsWith(`${rk}.`) || rk.startsWith(`${key}.`))) {
            return list;
        }
    }
    return hotelFallback;
}
function enrichDetailsFromContent(input) {
    const { content, searchCenter, facilityCatalog } = input;
    const details = { ...input.details };
    if (!content)
        return details;
    const imageUrl = (0, hotelbeds_content_client_1.pickPrimaryHotelImage)(content);
    const roomImages = (0, hotelbeds_content_client_1.pickRoomImages)(content);
    const roomGalleries = (0, hotelbeds_content_client_1.pickRoomImageLists)(content);
    const hotelGallery = roomGalleries.__hotel__ || [];
    const hotelLat = Number(content.coordinates?.latitude ?? details.latitude);
    const hotelLng = Number(content.coordinates?.longitude ?? details.longitude);
    if (imageUrl)
        details.imageUrl = imageUrl;
    if (content.images?.length) {
        details.images = content.images
            .filter((img) => img.path)
            .slice(0, 16)
            .map((img) => ({
            url: (0, hotelbeds_content_client_1.hotelbedsImageUrl)(img.path, "bigger") || `https://photos.hotelbeds.com/giata/bigger/${img.path}`,
            roomCode: img.roomCode,
            type: img.imageTypeCode,
        }));
    }
    else if (imageUrl) {
        details.images = [{ url: imageUrl }];
    }
    // Never leave hero empty when we have any gallery URL
    if (!details.imageUrl && details.images?.[0]?.url) {
        details.imageUrl = details.images[0].url;
    }
    const mapped = mapFacilityLabels(content.facilities, facilityCatalog);
    details.facilities = [...new Set([...(details.facilities || []), ...mapped.filterIds])];
    details.facilityLabels = mapped.human.slice(0, 16);
    if (content.description?.content) {
        details.description = content.description.content;
    }
    if (content.address?.content) {
        details.address = content.address.content;
    }
    if (content.ranking != null) {
        // Hotelbeds Content `ranking` is an internal popularity index (≈1–100),
        // NOT a guest review score. Store for sorting hints only — never invent reviews.
        details.ranking = content.ranking;
        delete details.rating;
        delete details.reviewCount;
    }
    if (searchCenter && Number.isFinite(hotelLat) && Number.isFinite(hotelLng)) {
        details.latitude = hotelLat;
        details.longitude = hotelLng;
        const dist = (0, hotelbeds_geo_1.buildDistanceInfo)({
            hotelLat,
            hotelLng,
            center: searchCenter,
            destinationCode: details.destinationCode,
            label: details.location,
        });
        details.distanceToCenterKm = dist.distanceToCenterKm;
        details.distanceToCenterLabel = dist.distanceToCenterLabel;
        details.poiDistances = dist.poiDistances;
    }
    if (details.rooms?.length) {
        details.rooms = details.rooms.map((room) => {
            const contentRoom = contentRoomOf(content, room.code);
            const resolved = (0, hotelbeds_content_client_1.resolveContentRoomCode)(content, room.code);
            const images = roomGalleryFor(roomGalleries, resolved || room.code, hotelGallery.length ? hotelGallery : imageUrl ? [imageUrl] : []);
            return {
                ...room,
                imageUrl: room.imageUrl ||
                    images[0] ||
                    (resolved ? roomImages[resolved] : undefined) ||
                    roomImages[room.code] ||
                    roomImages[room.code.split(".")[0] || ""] ||
                    imageUrl,
                images: images.slice(0, 8),
                facilities: mapRoomFacilities(content, resolved || room.code, facilityCatalog),
                description: contentRoom?.description?.content?.trim() || room.description,
                occupancy: contentRoom
                    ? {
                        minPax: contentRoom.minPax,
                        maxPax: contentRoom.maxPax,
                        maxAdults: contentRoom.maxAdults,
                        maxChildren: contentRoom.maxChildren,
                    }
                    : room.occupancy,
            };
        });
    }
    details.roomImages = roomImages;
    return details;
}
//# sourceMappingURL=hotelbeds-content-mapper.js.map