import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  distanceAnchor,
  hotelPickCard,
  hotelPickCustomerText,
  hotelPickDescription,
  hotelPickListBody,
  hotelPickRows,
  hotelResultPage,
  isHotelMoreRequest,
  visibleHotelPicks,
} from "./hotel-pick-list";

const hotels = Array.from({ length: 12 }, (_, i) => ({
  id: `hb-${i + 1}`,
  name: `فندق ${i + 1}`,
  stars: 4,
  priceFrom: 20 + i,
  currency: "KWD",
  distanceToCenterLabel: `${i + 1} كم`,
}));

describe("visible hotel picks", () => {
  it("keeps the short list that was just shown", () => {
    const result = visibleHotelPicks({
      hotels,
      offset: 0,
      shownCount: 5,
    });
    assert.deepEqual(
      result.picks.map((row) => row.id),
      ["hb-1", "hb-2", "hb-3", "hb-4", "hb-5"],
    );
    assert.equal(result.truncated, false);
    assert.equal(result.limit, "short");
  });

  it("offers only the first 10 when المزيد shows the whole area", () => {
    const result = visibleHotelPicks({
      hotels,
      offset: 0,
      shownCount: 12,
    });
    assert.equal(result.picks.length, 10);
    assert.equal(result.picks[0]?.id, "hb-1");
    assert.equal(result.picks[9]?.id, "hb-10");
    assert.equal(result.truncated, true);
    assert.equal(result.limit, "whatsapp");
  });

  it("starts at the saved offset", () => {
    const result = visibleHotelPicks({
      hotels,
      offset: 5,
      shownCount: 3,
    });
    assert.deepEqual(
      result.picks.map((row) => row.name),
      ["فندق 6", "فندق 7", "فندق 8"],
    );
  });

  it("describes distance and price, and rewrites a tap to the full name", () => {
    const description = hotelPickDescription({
      id: "hb-1",
      name: "فندق الصفوة رويال",
      stars: 5,
      priceFrom: 45.5,
      currency: "KWD",
      distanceToCenterLabel: "0.4 كم",
    });
    assert.equal(description, "0.4 كم · من 45.50 KWD · 5★");
    assert.equal(
      hotelPickCustomerText({
        text: "فندق الصفوة",
        hotelPickId: "hb-9",
        hotels,
      }),
      "اخترت الفندق: فندق 9\nhotelId: hb-9",
    );
    assert.equal(
      hotelPickCustomerText({ text: "المزيد" }),
      "المزيد",
    );
    assert.match(hotelPickListBody("whatsapp"), /10/);
    assert.match(hotelPickListBody("whatsapp"), /اسم الفندق/);
    assert.match(hotelPickListBody("short"), /ليسهل الاختيار/);
    assert.match(hotelPickListBody("short"), /المزيد/);
    assert.doesNotMatch(hotelPickListBody(null), /10/);
    const page = hotelResultPage({ hotels, offset: 0 });
    assert.equal(page.picks.length, 9);
    assert.equal(page.hasMore, true);
    const next = hotelResultPage({ hotels, offset: 9 });
    assert.equal(next.picks.length, 3);
    assert.equal(next.hasMore, false);
    assert.equal(distanceAnchor("القاهرة"), "مركز القاهرة");
    assert.equal(distanceAnchor("مكة"), "الحرم المكي");
    assert.equal(distanceAnchor("الحرم المكي"), "الحرم المكي");
    assert.equal(distanceAnchor("الأهرامات"), "الأهرامات");
    const card = hotelPickCard({
      stay: {
        location: "مكة",
        checkInDate: "2026-12-01",
        checkOutDate: "2026-12-04",
        adults: 2,
        children: 1,
      },
      picks: page.picks.slice(0, 2),
      hasMore: true,
    });
    assert.match(card.body, /📍 الوجهة: \*مكة\*/);
    assert.match(card.body, /الدخول: 1 ديسمبر 2026/);
    assert.match(card.body, /المغادرة: 4 ديسمبر 2026/);
    const entryAt = card.body.indexOf("الدخول:");
    const leaveAt = card.body.indexOf("المغادرة:");
    assert.ok(entryAt >= 0 && leaveAt > entryAt);
    assert.match(card.body, /👥 النزلاء: بالغان وطفل واحد/);
    assert.match(card.body, /🏨 \*فندق 1\* ★4/);
    assert.match(card.body, /السعر يبدأ من/);
    assert.match(card.body, /KWD 20\.00/);
    assert.match(card.body, /للإقامة 3 ليالٍ/);
    assert.doesNotMatch(card.body, /1\. فندق/);
    assert.equal(card.button, "اختر الفندق");
    assert.equal(card.footer, undefined);
    assert.doesNotMatch(card.body, /اضغط المزيد/);
    assert.match(card.body, /\u200F🏨 \*فندق 1\*/);
    assert.match(card.body, /\u200F💰 السعر يبدأ من/);
    assert.match(card.body, /يبعد/);
    assert.match(card.body, /عن الحرم المكي/);
    assert.doesNotMatch(card.body, /عن مكة/);
    const english = hotelPickCard({
      stay: { location: "القاهرة", checkInDate: "2026-11-20", checkOutDate: "2026-11-23", adults: 2 },
      picks: [{
        id: "sol",
        name: "Sol Pyramids Inn",
        stars: 4,
        priceFrom: 120.49,
        currency: "KWD",
        distanceToCenterLabel: "6.5 كم",
      }],
      hasMore: true,
    });
    assert.match(english.body, /\u200E🏨 \*Sol Pyramids Inn\* ★4/);
    assert.doesNotMatch(english.body, /\u2800/);
    assert.match(english.body, /\u200F💰 السعر يبدأ من \u2066\*KWD 120\.49\*/);
    assert.match(english.body, /يبعد/);
    assert.match(english.body, /6\.5 كم/);
    assert.match(english.body, /عن مركز القاهرة/);
    assert.doesNotMatch(english.body, /عن القاهرة/);
    const full = hotelPickCard({
      stay: { location: "مكة", checkInDate: "2026-12-01", checkOutDate: "2026-12-04", adults: 2 },
      picks: page.picks,
      hasMore: true,
    });
    assert.match(full.body, /يبعد/);
    assert.match(full.body, /عن الحرم المكي/);
    assert.match(full.body, /🏨 \*فندق 9\* ★4/);
    const rows = hotelPickRows(page.picks, true);
    assert.equal(rows.length, 10);
    assert.equal(rows[9]?.id, "hotels:more");
    assert.equal(rows[9]?.title, "المزيد");
    assert.ok(rows.slice(0, 9).every((row) => row.id.startsWith("hotel:")));
    const shortCard = hotelPickCard({
      stay: { location: "دبي", checkInDate: "2026-12-01", checkOutDate: "2026-12-02", adults: 1 },
      picks: next.picks,
      hasMore: false,
    });
    assert.match(shortCard.body, /الدخول: 1 ديسمبر 2026/);
    assert.match(shortCard.body, /المغادرة: 2 ديسمبر 2026/);
    assert.match(shortCard.body, /👥 النزلاء: بالغ واحد/);
    assert.match(shortCard.body, /🏨 \*فندق 11\*/);
    assert.match(shortCard.body, /للإقامة ليلة واحدة/);
    assert.doesNotMatch(shortCard.body, /اكتب/);
    assert.equal(shortCard.footer, undefined);
    assert.equal(isHotelMoreRequest("المزيد"), true);
    assert.equal(isHotelMoreRequest("أريد فندقاً"), false);
  });
});
