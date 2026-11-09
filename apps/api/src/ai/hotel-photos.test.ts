import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  advanceHotelPhotos,
  commonsPhotoUrls,
  customerWantsHotelPhotos,
  isPhotoMoreRequest,
  mergeHotelPhotos,
  photoKey,
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
    assert.equal(isPhotoMoreRequest("صور أكثر"), true);
    assert.equal(isPhotoMoreRequest("المزيد من الصور"), true);
    assert.equal(isPhotoMoreRequest("المزيد"), false);
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

  it("treats two sizes of the same supplier file as one photo", () => {
    const bigger = "https://photos.hotelbeds.com/giata/bigger/12/123/123a_hb_ro_001.jpg";
    const xxl = "https://photos.hotelbeds.com/giata/xxl/12/123/123a_hb_ro_001.jpg";
    assert.equal(photoKey(bigger), photoKey(xxl));
    assert.deepEqual(pickHotelPhotoUrls([bigger, xxl, gallery("lobby")], 10), [
      bigger,
      gallery("lobby"),
    ]);
  });

  it("keeps photos already shown and appends a different public image", async () => {
    const supplier = gallery("pool");
    const kept = mergeHotelPhotos(
      { hotelId: "hb-9", name: "Burj Al Arab", urls: [supplier], shown: 1 },
      { hotelId: "hb-9", name: "Burj Al Arab", urls: [supplier, gallery("lobby")] },
    );
    assert.equal(kept.shown, 1);
    assert.deepEqual(kept.urls, [supplier, gallery("lobby")]);
    const fresh = "https://upload.wikimedia.org/wikipedia/commons/d/d6/Burj_Al_Arab_Hotel.jpg";
    const payload = {
      query: {
        pages: {
          "1": {
            title: "File:Burj Al Arab Hotel.jpg",
            index: 1,
            imageinfo: [{ thumburl: `${fresh}?utm_source=commons`, mime: "image/jpeg" }],
          },
          "2": {
            title: "File:Burj Al Arab Hotel.jpg",
            index: 2,
            imageinfo: [{ url: fresh, mime: "image/jpeg" }],
          },
          "3": {
            title: "File:City map.svg",
            index: 3,
            imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/a/a1/City_map.svg", mime: "image/svg+xml" }],
          },
        },
      },
    };
    assert.deepEqual(commonsPhotoUrls(payload, { name: "Burj Al Arab", already: [fresh] }), []);
    const advanced = await advanceHotelPhotos({
      photos: { hotelId: "hb-9", name: "Burj Al Arab", urls: [supplier], shown: 1 },
      more: true,
      fetchImpl: (async () =>
        new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch,
    });
    assert.deepEqual(advanced.page, [fresh]);
    assert.equal(advanced.addedOutside, true);
    assert.deepEqual(advanced.photos?.urls, [supplier, fresh]);
  });

  it("fills the first photo call up to six different images", async () => {
    const supplier = [
      gallery("pool"),
      gallery("lobby"),
    ];
    const pages: Record<string, { title: string; index: number; imageinfo: Array<{ url: string; mime: string }> }> = {};
    for (let index = 1; index <= 4; index += 1) {
      pages[String(index)] = {
        title: `File:Burj Al Arab view ${index}.jpg`,
        index,
        imageinfo: [{
          url: `https://upload.wikimedia.org/wikipedia/commons/a/a${index}/Burj_Al_Arab_view_${index}.jpg`,
          mime: "image/jpeg",
        }],
      };
    }
    const advanced = await advanceHotelPhotos({
      photos: { hotelId: "hb-9", name: "Burj Al Arab", urls: supplier, shown: 0 },
      more: false,
      fetchImpl: (async () =>
        new Response(JSON.stringify({ query: { pages } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })) as typeof fetch,
    });
    assert.equal(advanced.page.length, 6);
    assert.equal(advanced.addedOutside, true);
    assert.deepEqual(advanced.page.slice(0, 2), supplier);
  });
});
