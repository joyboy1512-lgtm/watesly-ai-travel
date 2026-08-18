import type { HotelPropertyDetails } from "@watesly-travel/shared";
import { buildDistanceInfo, type GeoCenter } from "./hotelbeds-geo";
import {
  pickPrimaryHotelImage,
  pickRoomImageLists,
  pickRoomImages,
} from "./hotelbeds-content-client";
import type { HbContentFacility, HbContentHotel } from "./hotelbeds-content-types";

const FILTER_FACILITY_MAP: Record<string, string[]> = {
  wifi: ["70:550", "60:261", "60:100"],
  parking: ["70:200", "70:220", "70:230"],
  pool: ["70:320", "73:10", "73:20"],
  gym: ["70:470"],
  spa: ["70:620", "70:560"],
};

const FALLBACK_LABELS: Record<string, string> = {
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

function facilityKey(f: HbContentFacility): string {
  return `${f.facilityGroupCode ?? 0}:${f.facilityCode ?? 0}`;
}

function isPresent(f: HbContentFacility): boolean {
  if (f.indYesOrNo === false || f.indLogic === false) return false;
  return true;
}

function mapFacilityLabels(
  facilities: HbContentFacility[] | undefined,
  catalog?: Map<string, string>,
  withFee = false,
): { human: string[]; filterIds: string[] } {
  const human: string[] = [];
  const seen = new Set<string>();
  const filterIds = new Set<string>();

  for (const f of facilities || []) {
    if (!isPresent(f)) continue;
    const key = facilityKey(f);
    const base =
      catalog?.get(key) ||
      FALLBACK_LABELS[key] ||
      f.description?.content?.trim();
    if (!base) continue;
    const label = withFee && f.indFee ? `${base} (برسوم)` : base;
    if (!seen.has(label)) {
      seen.add(label);
      human.push(label);
    }
    for (const [filterId, keys] of Object.entries(FILTER_FACILITY_MAP)) {
      if (keys.includes(key)) filterIds.add(filterId);
    }
  }

  return { human, filterIds: [...filterIds] };
}

function mapRoomFacilities(
  content: HbContentHotel | undefined,
  roomCode: string | undefined,
  catalog?: Map<string, string>,
): string[] {
  const room = content?.rooms?.find((r) => r.roomCode === roomCode);
  return mapFacilityLabels(room?.roomFacilities, catalog, true).human.slice(0, 12);
}

function contentRoomOf(content: HbContentHotel | undefined, roomCode: string) {
  return content?.rooms?.find(
    (r) => r.roomCode === roomCode || r.roomCode === roomCode.split(".")[0],
  );
}

export function enrichDetailsFromContent(input: {
  details: HotelPropertyDetails;
  content?: HbContentHotel;
  searchCenter?: GeoCenter;
  facilityCatalog?: Map<string, string>;
}): HotelPropertyDetails {
  const { content, searchCenter, facilityCatalog } = input;
  const details = { ...input.details };
  if (!content) return details;

  const imageUrl = pickPrimaryHotelImage(content);
  const roomImages = pickRoomImages(content);
  const roomGalleries = pickRoomImageLists(content);
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
    details.rooms = details.rooms.map((room) => {
      const contentRoom = contentRoomOf(content, room.code);
      const images =
        roomGalleries[room.code] ||
        roomGalleries[room.code.split(".")[0] || ""] ||
        [];
      return {
        ...room,
        imageUrl:
          room.imageUrl ||
          images[0] ||
          roomImages[room.code] ||
          roomImages[room.code.split(".")[0] || ""],
        images: images.slice(0, 8),
        facilities: mapRoomFacilities(content, room.code, facilityCatalog),
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
