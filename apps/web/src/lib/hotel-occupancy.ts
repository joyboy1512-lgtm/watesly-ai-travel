/** Per-room hotel occupancy for search and booking. */

import {
  arabicAdultCount as sharedAdult,
  arabicChildCount as sharedChild,
  arabicGuestCount as sharedGuest,
  arabicNightCount as sharedNight,
  arabicRoomCount as sharedRoom,
  arabicTravelerCount as sharedTraveler,
  arabicNightWord,
  arabicRoomWord,
} from "@watesly-travel/shared";

export type HotelRoomOccupancyInput = {
  adults: number;
  /** Ages 0–17 for each child in this room. Length = children count. */
  childAges: number[];
};

export type HotelOccupancyState = {
  rooms: HotelRoomOccupancyInput[];
};

export function emptyRoom(adults = 2): HotelRoomOccupancyInput {
  return { adults: Math.max(1, adults), childAges: [] };
}

export function defaultOccupancy(rooms = 1, adults = 2, children = 0): HotelOccupancyState {
  const roomCount = Math.max(1, rooms);
  const list: HotelRoomOccupancyInput[] = [];
  let remainingAdults = Math.max(1, adults);
  let remainingChildren = Math.max(0, children);
  for (let i = 0; i < roomCount; i += 1) {
    const roomsLeft = roomCount - i;
    const a = Math.max(1, Math.floor(remainingAdults / roomsLeft));
    const c = Math.floor(remainingChildren / roomsLeft);
    list.push({
      adults: a,
      childAges: Array.from({ length: c }, () => 8),
    });
    remainingAdults -= a;
    remainingChildren -= c;
  }
  if (remainingAdults > 0) list[0]!.adults += remainingAdults;
  while (remainingChildren > 0) {
    list[0]!.childAges.push(8);
    remainingChildren -= 1;
  }
  return { rooms: list };
}

export function occupancyTotals(state: HotelOccupancyState) {
  const adults = state.rooms.reduce((s, r) => s + Math.max(1, r.adults), 0);
  const childAges = state.rooms.flatMap((r) => r.childAges);
  return {
    rooms: Math.max(1, state.rooms.length),
    adults,
    children: childAges.length,
    childAges,
    childrenAgesCsv: childAges.join(","),
  };
}

export function validateOccupancy(state: HotelOccupancyState): string | null {
  if (!state.rooms.length) return "أضف غرفة واحدة على الأقل";
  for (let i = 0; i < state.rooms.length; i += 1) {
    const room = state.rooms[i]!;
    if (room.adults < 1) return `الغرفة ${i + 1}: يجب وجود بالغ واحد على الأقل`;
    if (room.adults + room.childAges.length > 8) {
      return `الغرفة ${i + 1}: الحد الأقصى 8 أشخاص`;
    }
    for (let c = 0; c < room.childAges.length; c += 1) {
      const age = room.childAges[c];
      if (age == null || !Number.isFinite(age) || age < 0 || age > 17) {
        return `الغرفة ${i + 1}: أدخل عمرًا صحيحًا للطفل ${c + 1} (0–17)`;
      }
    }
  }
  return null;
}

export function setRoomCount(state: HotelOccupancyState, count: number): HotelOccupancyState {
  const n = Math.max(1, Math.min(6, count));
  const rooms = [...state.rooms];
  while (rooms.length < n) rooms.push(emptyRoom(1));
  while (rooms.length > n) rooms.pop();
  return { rooms };
}

export const arabicGuestCount = sharedGuest;
export const arabicNightCount = sharedNight;
export const arabicAdultCount = sharedAdult;
export const arabicChildCount = sharedChild;
export const arabicRoomCount = sharedRoom;
export const arabicTravelerCount = sharedTraveler;
export { arabicNightWord, arabicRoomWord };
