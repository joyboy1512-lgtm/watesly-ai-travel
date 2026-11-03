import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerWantsHotelPhotos,
  pickHotelPhotoUrls,
  readHotelPhotoSet,
  stripExternalLinks,
} from "./hotel-photos";

const gallery = (path: string) =>
  `https://photos.hotelbeds.com/giata/bigger/${path}.jpg`;

describe("hotel photos", () => {
  it("keeps gallery files and drops pages that can show a price", () => {
    const urls = pickHotelPhotoUrls([
      { url: "https://www.booking.com/hotel/sa/example.html" },
      { url: "https://example-hotel.com/rates", roomCode: "DBL" },
      { url: gallery("room"), roomCode: "DBL" },
      { url: gallery("pool") },
      { url: gallery("lobby") },
      { url: gallery("pool") },
      { url: gallery("facade") },
      { url: gallery("dining") },
      { url: "http://photos.hotelbeds.com/giata/bigger/insecure.jpg" },
    ]);
    assert.deepEqual(urls, [
      gallery("pool"),
      gallery("lobby"),
      gallery("facade"),
      gallery("dining"),
    ]);
  });

  it("hears a photo request and ignores a passport photo", () => {
    assert.equal(customerWantsHotelPhotos("أبي صور الفندق"), true);
    assert.equal(customerWantsHotelPhotos("send photos"), true);
    assert.equal(customerWantsHotelPhotos("صورة الجواز"), false);
    assert.equal(customerWantsHotelPhotos("المزيد"), false);
  });

  it("reads only a saved price-free set and strips links from the reply", () => {
    const saved = readHotelPhotoSet({
      lastHotelPhotos: {
        hotelId: "hb-9",
        name: "فندق الصفوة",
        urls: [gallery("pool"), "https://hotel.example/book"],
      },
    });
    assert.deepEqual(saved, {
      hotelId: "hb-9",
      name: "فندق الصفوة",
      urls: [gallery("pool")],
    });
    assert.equal(
      stripExternalLinks("هذه صور الفندق https://hotel.example/rates من الداخل."),
      "هذه صور الفندق من الداخل.",
    );
  });
});
