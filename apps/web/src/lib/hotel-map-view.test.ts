import assert from "node:assert/strict";
import test from "node:test";
import {
  centroidLatLng,
  clampMapZoom,
  latLngFromWorldPixels,
  panCenter,
  projectLatLng,
  unprojectLatLng,
  worldPixels,
  zoomToFitPins,
} from "./hotel-map-view";

test("project/unproject round-trips Barcelona", () => {
  const src = { lat: 41.3874, lng: 2.1686 };
  const p = projectLatLng(src.lat, src.lng, 13);
  const back = unprojectLatLng(p.x, p.y, 13);
  assert.ok(Math.abs(back.lat - src.lat) < 0.0001);
  assert.ok(Math.abs(back.lng - src.lng) < 0.0001);
});

test("panCenter moves west when dragging right", () => {
  const start = { lat: 41.39, lng: 2.17 };
  const moved = panCenter(start, 13, 256, 0);
  assert.ok(moved.lng < start.lng);
});

test("zoomToFitPins tightens when hotels are close", () => {
  const tight = zoomToFitPins(
    [
      { lat: 41.387, lng: 2.168 },
      { lat: 41.389, lng: 2.17 },
    ],
    450,
    520,
  );
  const wide = zoomToFitPins(
    [
      { lat: 41.2, lng: 1.9 },
      { lat: 41.6, lng: 2.4 },
    ],
    450,
    520,
  );
  assert.ok(tight > wide);
  assert.equal(clampMapZoom(99), 16);
});

test("world pixel helper stays consistent with project", () => {
  const px = worldPixels(41.38, 2.16, 12);
  const back = latLngFromWorldPixels(px.x, px.y, 12);
  assert.ok(Math.abs(back.lat - 41.38) < 0.0001);
  const mid = centroidLatLng([
    { lat: 41, lng: 2 },
    { lat: 43, lng: 4 },
  ]);
  assert.equal(mid?.lat, 42);
  assert.equal(mid?.lng, 3);
});
