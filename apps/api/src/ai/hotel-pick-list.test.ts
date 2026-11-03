import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hotelPickCustomerText,
  hotelPickDescription,
  hotelPickListBody,
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
  });
});
