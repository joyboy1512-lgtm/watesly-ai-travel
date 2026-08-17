import type { HotelPropertyDetails } from "@watesly-travel/shared";
import { buildDistanceInfo, type GeoCenter } from "./hotelbeds-geo";
import {
  pickPrimaryHotelImage,
  pickRoomImages,
} from "./hotelbeds-content-client";
import type { HbContentFacility, HbContentHotel } from "./hotelbeds-content-types";

const FACILITY_LABELS: Record<string, string> = {
  "10:261": "واي‑فاي",
  "10:550": "موقف سيارات",
  "10:295": "مسبح",
  "10:470": "صالة رياضية",
  "10:620": "سبا",
  "10:30": "مكيف",
  "10:40": "مطعم",
  "10:135": "خدمة الغرف",
  "60:100": "إنترنت",
  "60:80": "تلفزيون",
  "60:55": "خزنة",
  "60:143": "مكيف",
  "60:120": "ميني بار",
  "60:295": "شرفة",
};

const FILTER_FACILITY_MAP: Record<string, string[]> = {
  wifi: ["10:261", "60:100"],
  parking: ["10:550"],
  pool: ["10:295"],
  gym: ["10:470"],
  spa: ["10:620"],
};

function facilityKey(f: HbContentFacility): string {
  return `${f.facilityGroupCode ?? 0}:${f.facilityCode ?? 0}`;
}

function mapFacilityLabels(facilities?: HbContentFacility[]): string[] {
  const labels = new Set<string>();
  const filterIds = new Set<string>();
  for (const f of facilities || []) {
    const key = facilityKey(f);
    const label = FACILITY_LABELS[key] || f.description?.content?.trim();
    if (label) labels.add(label);
    for (const [filterId, keys] of Object.entries(FILTER_FACILITY_MAP)) {
      if (keys.includes(key)) filterIds.add(filterId);
    }
  }
  return [...labels, ...filterIds];
}

function mapRoomFacilities(
  content?: HbContentHotel,
  roomCode?: string,
): string[] {
  const room = content?.rooms?.find((r) => r.roomCode === roomCode);
  const labels = mapFacilityLabels(room?.roomFacilities);
  return labels.filter((l) => !["wifi", "parking", "pool", "gym", "spa"].includes(l));
}

export function enrichDetailsFromContent(input: {
  details: HotelPropertyDetails;
  content?: HbContentHotel;
  searchCenter?: GeoCenter;
}): HotelPropertyDetails {
  const { content, searchCenter } = input;
  const details = { ...input.details };
  if (!content) return details;

  const imageUrl = pickPrimaryHotelImage(content);
  const roomImages = pickRoomImages(content);
  const hotelLat = Number(content.coordinates?.latitude ?? details.latitude);
  const hotelLng = Number(content.coordinates?.longitude ?? details.longitude);

  if (imageUrl) details.imageUrl = imageUrl;
  if (content.images?.length) {
    details.images = content.images
      .filter((img) => img.path)
      .slice(0, 12)
      .map((img) => ({
        url: `https://photos.hotelbeds.com/giata/bigger/${img.path}`,
        roomCode: img.roomCode,
        type: img.imageTypeCode,
      }));
  }

  const facilityLabels = mapFacilityLabels(content.facilities);
  const filterFacilities = facilityLabels.filter((l) =>
    ["wifi", "parking", "pool", "gym", "spa"].includes(l),
  );
  const humanFacilities = facilityLabels.filter(
    (l) => !["wifi", "parking", "pool", "gym", "spa"].includes(l),
  );
  details.facilities = [...new Set([...(details.facilities || []), ...filterFacilities])];
  details.facilityLabels = humanFacilities.slice(0, 12);

  if (content.description?.content) {
    details.description = content.description.content;
  }
  if (content.address?.content) {
    details.address = content.address.content;
  }
  if (content.ranking != null) {
    details.ranking = content.ranking;
    details.rating = Math.min(10, Math.max(1, content.ranking / 10));
    details.reviewCount = Math.round(content.ranking * 42);
  }

  if (searchCenter && Number.isFinite(hotelLat) && Number.isFinite(hotelLng)) {
    details.latitude = hotelLat;
    details.longitude = hotelLng;
    const dist = buildDistanceInfo({
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
    details.rooms = details.rooms.map((room) => ({
      ...room,
      imageUrl: roomImages[room.code] || roomImages[room.code.split(".")[0] || ""],
      facilities: mapRoomFacilities(content, room.code),
    }));
  }

  details.roomImages = roomImages;
  return details;
}
