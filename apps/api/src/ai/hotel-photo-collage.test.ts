import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  COLLAGE_GAP,
  COLLAGE_PAD,
  COLLAGE_RADIUS,
  buildHotelPhotoCard,
  composeHotelPhotoCollage,
  hotelCollageLayout,
  prepareWhatsAppPhoto,
} from "./hotel-photo-collage";

async function solid(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 80, height: 60, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

function pixel(data: Buffer, info: { width: number; channels: number }, x: number, y: number) {
  const index = (y * info.width + x) * info.channels;
  return [data[index]!, data[index + 1]!, data[index + 2]!];
}

describe("hotel photo collage", () => {
  it("places one large photo on the left and two stacked photos on the right", async () => {
    const layout = hotelCollageLayout(3);
    assert.equal(layout.slots[0]?.width, layout.slots[1]?.width);
    assert.equal(layout.slots[0]?.height, (layout.slots[1]?.height || 0) + COLLAGE_GAP + (layout.slots[2]?.height || 0));
    assert.ok((layout.slots[1]?.top || 0) + (layout.slots[1]?.height || 0) + COLLAGE_GAP <= (layout.slots[2]?.top || 0));

    const card = await composeHotelPhotoCollage(
      [
        await solid({ r: 220, g: 30, b: 30 }),
        await solid({ r: 30, g: 180, b: 40 }),
        await solid({ r: 30, g: 60, b: 210 }),
      ],
      "png",
    );
    assert.ok(card);
    const { data, info } = await sharp(card!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, layout.width);
    assert.equal(info.height, layout.height);
    const left = layout.slots[0]!;
    const top = layout.slots[1]!;
    const bottom = layout.slots[2]!;
    const center = (slot: typeof left) =>
      pixel(data, info, slot.left + Math.floor(slot.width / 2), slot.top + Math.floor(slot.height / 2));
    const [lr, lg, lb] = center(left);
    const [tr, tg, tb] = center(top);
    const [br, bg, bb] = center(bottom);
    assert.ok(lr > 180 && lg < 80 && lb < 80);
    assert.ok(tg > 140 && tr < 80 && tb < 80);
    assert.ok(bb > 160 && br < 80 && bg < 120);
    const gap = pixel(data, info, left.left + left.width + Math.floor(COLLAGE_GAP / 2), left.top + 40);
    assert.ok(gap.every((channel) => channel > 245));
    const corner = pixel(data, info, left.left + 1, left.top + 1);
    assert.ok(corner.every((channel) => channel > 245));
    const inside = pixel(data, info, left.left + COLLAGE_RADIUS + 4, left.top + COLLAGE_RADIUS + 4);
    assert.ok(inside[0]! > 180 && inside[1]! < 80);
    assert.ok(pixel(data, info, 0, 0).every((channel) => channel > 245));
  });

  it("uses the whole right column when only two photos are available", async () => {
    const card = await composeHotelPhotoCollage(
      [await solid({ r: 220, g: 30, b: 30 }), await solid({ r: 30, g: 60, b: 210 })],
      "png",
    );
    const layout = hotelCollageLayout(2);
    const { data, info } = await sharp(card!).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const right = layout.slots[1]!;
    const mid = pixel(data, info, right.left + 20, right.top + Math.floor(right.height / 2));
    assert.ok(mid[2]! > 160 && mid[0]! < 80);
  });

  it("prepares a jpeg WhatsApp can deliver without fetching a link", async () => {
    const png = await solid({ r: 20, g: 80, b: 180 });
    const jpeg = await prepareWhatsAppPhoto(
      "https://photos.hotelbeds.com/giata/bigger/pool.jpg",
      (async () => new Response(png, { status: 200, headers: { "content-type": "image/png" } })) as typeof fetch,
    );
    assert.ok(jpeg);
    assert.equal(jpeg![0], 0xff);
    assert.equal(jpeg![1], 0xd8);
    assert.equal(
      await prepareWhatsAppPhoto("https://www.booking.com/hotel.jpg", (async () => {
        throw new Error("should not fetch");
      }) as typeof fetch),
      null,
    );
  });

  it("does not invent a card from a single photo or a booking page", async () => {
    assert.equal(await composeHotelPhotoCollage([await solid({ r: 1, g: 2, b: 3 })]), null);
    const fetched: string[] = [];
    const card = await buildHotelPhotoCard(
      ["https://www.booking.com/hotel/photo.jpg", "https://photos.hotelbeds.com/giata/bigger/a.jpg"],
      (async (url: string) => {
        fetched.push(url);
        return new Response(await solid({ r: 10, g: 20, b: 30 }), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }) as typeof fetch,
    );
    assert.equal(card, null);
    assert.deepEqual(fetched, ["https://photos.hotelbeds.com/giata/bigger/a.jpg"]);
  });
});
