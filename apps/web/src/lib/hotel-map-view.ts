export const MAP_TILE = 256;
export const MAP_MIN_ZOOM = 11;
export const MAP_MAX_ZOOM = 16;

export type MapLatLng = { lat: number; lng: number };

export function clampMapZoom(zoom: number): number {
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, Math.round(zoom)));
}

/** Web Mercator tile coordinates (not pixels). */
export function projectLatLng(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = 2 ** zoom;
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export function unprojectLatLng(x: number, y: number, zoom: number): MapLatLng {
  const n = 2 ** zoom;
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}

export function worldPixels(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const p = projectLatLng(lat, lng, zoom);
  return { x: p.x * MAP_TILE, y: p.y * MAP_TILE };
}

export function latLngFromWorldPixels(x: number, y: number, zoom: number): MapLatLng {
  return unprojectLatLng(x / MAP_TILE, y / MAP_TILE, zoom);
}

export function centroidLatLng(points: MapLatLng[]): MapLatLng | null {
  const valid = points.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (!valid.length) return null;
  return {
    lat: valid.reduce((sum, p) => sum + p.lat, 0) / valid.length,
    lng: valid.reduce((sum, p) => sum + p.lng, 0) / valid.length,
  };
}

export function zoomToFitPins(
  points: MapLatLng[],
  viewW: number,
  viewH: number,
  padding = 0.78,
): number {
  if (points.length < 2) return 13;
  const width = Math.max(160, viewW);
  const height = Math.max(160, viewH);
  for (let zoom = MAP_MAX_ZOOM; zoom >= MAP_MIN_ZOOM; zoom -= 1) {
    const xs = points.map((p) => worldPixels(p.lat, p.lng, zoom).x);
    const ys = points.map((p) => worldPixels(p.lat, p.lng, zoom).y);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    if (spanX <= width * padding && spanY <= height * padding) return zoom;
  }
  return MAP_MIN_ZOOM;
}

export function panCenter(
  center: MapLatLng,
  zoom: number,
  dx: number,
  dy: number,
): MapLatLng {
  const px = worldPixels(center.lat, center.lng, zoom);
  return latLngFromWorldPixels(px.x - dx, px.y - dy, zoom);
}

export function zoomAroundPoint(
  center: MapLatLng,
  zoom: number,
  nextZoom: number,
  viewW: number,
  viewH: number,
  cursorX: number,
  cursorY: number,
): MapLatLng {
  const z0 = clampMapZoom(zoom);
  const z1 = clampMapZoom(nextZoom);
  if (z0 === z1) return center;
  const world = worldPixels(center.lat, center.lng, z0);
  const focus = {
    x: world.x - viewW / 2 + cursorX,
    y: world.y - viewH / 2 + cursorY,
  };
  const focusLatLng = latLngFromWorldPixels(focus.x, focus.y, z0);
  const focus2 = worldPixels(focusLatLng.lat, focusLatLng.lng, z1);
  return latLngFromWorldPixels(focus2.x - cursorX + viewW / 2, focus2.y - cursorY + viewH / 2, z1);
}

export function markerInView(
  pin: MapLatLng,
  center: MapLatLng,
  zoom: number,
  viewW: number,
  viewH: number,
  pad = 24,
): boolean {
  const origin = worldPixels(center.lat, center.lng, zoom);
  const p = worldPixels(pin.lat, pin.lng, zoom);
  const left = p.x - (origin.x - viewW / 2);
  const top = p.y - (origin.y - viewH / 2);
  return left >= -pad && left <= viewW + pad && top >= -pad && top <= viewH + pad;
}
