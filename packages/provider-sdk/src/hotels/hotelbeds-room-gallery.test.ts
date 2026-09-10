import assert from "node:assert/strict";
import test from "node:test";
import { roomGalleryFor } from "./hotelbeds-content-mapper";

test("roomGalleryFor never borrows another room's photos", () => {
  const galleries = {
    "DBL.ST": ["https://cdn/dbl.jpg"],
    "SUI.AS": ["https://cdn/suite.jpg"],
    __hotel__: ["https://cdn/hotel.jpg"],
  };
  assert.deepEqual(roomGalleryFor(galleries, "DBL.ST-1", galleries.__hotel__), [
    "https://cdn/dbl.jpg",
  ]);
  assert.deepEqual(roomGalleryFor(galleries, "TWN.ST", galleries.__hotel__), [
    "https://cdn/hotel.jpg",
  ]);
  assert.notDeepEqual(roomGalleryFor(galleries, "TWN.ST", galleries.__hotel__), [
    "https://cdn/suite.jpg",
  ]);
});
