import sharp from "sharp";
import { isCustomerHotelPhotoUrl } from "./hotel-photos";

/** One WhatsApp image: a near-square photo on the left, two stacked photos on the right. */
export const COLLAGE_WIDTH = 1200;
export const COLLAGE_PAD = 16;
export const COLLAGE_GAP = 10;
export const COLLAGE_RADIUS = 24;

export type CollageSlot = { left: number; top: number; width: number; height: number };

export function hotelCollageLayout(count: 2 | 3): {
  width: number;
  height: number;
  slots: CollageSlot[];
} {
  const column = Math.floor((COLLAGE_WIDTH - COLLAGE_PAD * 2 - COLLAGE_GAP) / 2);
  const height = COLLAGE_PAD * 2 + column;
  const right = COLLAGE_PAD + column + COLLAGE_GAP;
  const left: CollageSlot = { left: COLLAGE_PAD, top: COLLAGE_PAD, width: column, height: column };
  if (count === 2) {
    return {
      width: COLLAGE_WIDTH,
      height,
      slots: [left, { left: right, top: COLLAGE_PAD, width: column, height: column }],
    };
  }
  const topHeight = Math.floor((column - COLLAGE_GAP) / 2);
  const bottomHeight = column - COLLAGE_GAP - topHeight;
  return {
    width: COLLAGE_WIDTH,
    height,
    slots: [
      left,
      { left: right, top: COLLAGE_PAD, width: column, height: topHeight },
      { left: right, top: COLLAGE_PAD + topHeight + COLLAGE_GAP, width: column, height: bottomHeight },
    ],
  };
}

async function roundedCover(input: Buffer, width: number, height: number): Promise<Buffer> {
  const covered = await sharp(input, { failOn: "none" })
    .rotate()
    .resize(width, height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="${height}" rx="${COLLAGE_RADIUS}" ry="${COLLAGE_RADIUS}" fill="#fff"/></svg>`,
  );
  return sharp(covered).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

export async function composeHotelPhotoCollage(
  images: Buffer[],
  format: "jpeg" | "png" = "jpeg",
): Promise<Buffer | null> {
  const sources = images.filter((row) => row.length > 32).slice(0, 3);
  if (sources.length < 2) return null;
  const layout = hotelCollageLayout(sources.length as 2 | 3);
  const tiles: Array<{ input: Buffer; left: number; top: number }> = [];
  for (let index = 0; index < sources.length; index += 1) {
    const slot = layout.slots[index];
    if (!slot) continue;
    try {
      tiles.push({
        input: await roundedCover(sources[index]!, slot.width, slot.height),
        left: slot.left,
        top: slot.top,
      });
    } catch {
      continue;
    }
  }
  if (tiles.length < 2) return null;
  const base = sharp({
    create: {
      width: layout.width,
      height: layout.height,
      channels: 3,
      background: "#ffffff",
    },
  }).composite(tiles);
  if (format === "png") return base.png().toBuffer();
  return base.jpeg({ quality: 82 }).toBuffer();
}

async function downloadHotelPhoto(url: string, fetchImpl: typeof fetch): Promise<Buffer | null> {
  if (!isCustomerHotelPhotoUrl(url)) return null;
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept: "image/jpeg,image/png,image/webp",
        "user-agent": "WeekendGate/1.0 (https://www.weekendgate.com; hotel photos)",
      },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (type && !/^image\/(jpe?g|png|webp)/i.test(type) && !/octet-stream/i.test(type)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 32 || bytes.length > 8_000_000) return null;
    return bytes;
  } catch {
    return null;
  }
}

/** Download up to three allowed hotel images and compose the WhatsApp card. */
export async function buildHotelPhotoCard(
  urls: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Buffer | null> {
  const downloaded = (
    await Promise.all(urls.slice(0, 3).map((url) => downloadHotelPhoto(url, fetchImpl)))
  ).filter((row): row is Buffer => Boolean(row));
  return composeHotelPhotoCollage(downloaded);
}
