import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSISTANT_CAN_ISSUE,
  ASSISTANT_HOLD_STATUS,
  applyNameFix,
  confirmLatestTraveler,
  holdBlockReason,
  holdCustomerMessage,
  hotelRoomItems,
  hotelRoomSelection,
  refundLabel,
  roomByTypedName,
  roomChoiceBody,
  roomTermsText,
  nextPhotoSlice,
  parseAssistantAction,
  selectItem,
  travelerFromPassport,
  travelerReview,
  tripMemoryLine,
  emptyAssistantState,
} from "./assistant-flow";

describe("assistant booking flow", () => {
  it("prices each room from the shop total and keeps the hold unconfirmed", () => {
    const rooms = hotelRoomItems({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-9",
      description: "صفوة",
      costAmountMinor: 100_000,
      sellAmountMinor: 120_000,
      currency: "KWD",
      revalidationToken: "offer",
      raw: {
        name: "صفوة",
        hotelCode: "9",
        checkInDate: "2026-12-01",
        checkOutDate: "2026-12-04",
        rateOptions: [
          { rateKey: "rk-1", roomName: "غرفة مزدوجة", boardName: "إفطار", net: 100, freeCancellation: true },
          { rateKey: "rk-2", roomName: "جناح", boardName: "إفطار", net: 150 },
          { rateKey: "rk-1b", roomName: "غرفة مزدوجة", boardName: "إفطار", net: 110 },
        ],
      },
    });
    assert.equal(rooms.length, 2);
    assert.equal(rooms[0]?.pickId, "room:0");
    assert.equal(rooms[0]?.sellAmountMinor, 120_000);
    assert.equal(rooms[1]?.sellAmountMinor, 180_000);
    const few = hotelRoomSelection({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-9",
      description: "صفوة",
      costAmountMinor: 100_000,
      sellAmountMinor: 120_000,
      currency: "KWD",
      raw: {
        rateOptions: [
          { roomName: "غرفة مزدوجة", boardName: "إفطار", net: 100 },
          { roomName: "جناح", boardName: "إفطار", net: 150 },
        ],
      },
    });
    assert.equal(few.truncated, false);
    assert.doesNotMatch(roomChoiceBody(false), /واتساب/);
    const many = hotelRoomSelection({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-9",
      description: "صفوة",
      costAmountMinor: 100_000,
      sellAmountMinor: 120_000,
      currency: "KWD",
      raw: {
        rateOptions: Array.from({ length: 12 }, (_, index) => ({
          roomName: `غرفة ${index + 1}`,
          boardName: "إفطار",
          net: 100 + index,
        })),
      },
    });
    assert.equal(many.uniqueCount, 12);
    assert.equal(many.truncated, true);
    assert.equal(many.items.length, 10);
    assert.equal(many.all.length, 12);
    assert.equal(many.items[0]?.snapshot.roomName, "غرفة 1");
    const hidden = many.all[11]!;
    assert.equal(roomByTypedName(many.all.slice(10), "غرفة 12")?.pickId, hidden.pickId);
    assert.equal(roomByTypedName(many.all, "غرفة 12")?.snapshot.roomName, "غرفة 12");
    assert.equal(roomByTypedName(many.all.slice(10), "كم سعر الغرفة 12 من فضلك لو سمحت"), null);
    assert.match(roomChoiceBody(true), /واتساب/);
    assert.match(roomChoiceBody(true), /أرخص 10/);
    assert.match(roomChoiceBody(true), /من الموظف/);
    assert.equal(ASSISTANT_CAN_ISSUE, false);
    assert.equal(ASSISTANT_HOLD_STATUS, "on_hold");
    assert.match(holdCustomerMessage(rooms.slice(0, 1)), /بانتظار تأكيد الموظف/);
    assert.doesNotMatch(holdCustomerMessage(rooms.slice(0, 1)), /تم تأكيد الحجز/);
  });

  it("reviews the passport name and blocks the hold until the customer confirms", () => {
    let state = emptyAssistantState();
    const traveler = travelerFromPassport(
      { firstName: "SARA", lastName: "ALI", passportNumber: "K123", nationality: "KW", birthDate: "1990-01-15" },
      0,
    );
    assert.ok(traveler);
    state = { ...state, travelers: [traveler!] };
    assert.match(travelerReview(traveler!), /SARA ALI/);
    state = selectItem(state, hotelRoomItems({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-1",
      description: "صفوة",
      costAmountMinor: 1000,
      sellAmountMinor: 1000,
      currency: "KWD",
      raw: { name: "صفوة", rateOptions: [{ roomName: "مزدوجة", boardName: "إفطار", net: 1, rateKey: "rk" }] },
    })[0]!);
    assert.match(holdBlockReason(state) || "", /جواز/);
    state = confirmLatestTraveler(state);
    state = selectItem(state, hotelRoomItems({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-9",
      description: "صفوة",
      costAmountMinor: 1000,
      sellAmountMinor: 1000,
      currency: "KWD",
      raw: { name: "صفوة", rateOptions: [{ roomName: "مزدوجة", boardName: "إفطار", net: 1, rateKey: "rk" }] },
    })[0]!);
    assert.equal(holdBlockReason({ ...state, holdBookingId: undefined, awaitingPassport: false }), null);
    state = applyNameFix(state, "SARA NASSER");
    assert.equal(state.travelers[0]?.firstName, "SARA");
    assert.equal(state.travelers[0]?.lastName, "NASSER");
    assert.equal(state.travelers[0]?.confirmed, false);
  });

  it("pages photos and keeps the saved trip when the date changes", () => {
    const slice = nextPhotoSlice({
      hotelId: "hb-1",
      name: "صفوة",
      urls: ["a", "b", "c", "d", "e"],
      shown: 4,
    }, true);
    assert.deepEqual(slice.urls, ["e"]);
    assert.equal(parseAssistantAction("photo:more")?.kind, "photo");
    assert.equal(parseAssistantAction("hotel:hb-1"), null);
    const line = tripMemoryLine({
      ...emptyAssistantState(),
      trip: { location: "الحرم المكي", checkInDate: "2026-12-01", adults: 2 },
    });
    assert.match(line, /الحرم المكي/);
    assert.match(line, /2026-12-01/);
  });

  it("shows refund deadline, supplier terms, and notes", () => {
    const rooms = hotelRoomItems({
      providerKey: "hotelbeds",
      providerOfferRef: "hb-9",
      description: "صفوة",
      costAmountMinor: 100_000,
      sellAmountMinor: 120_000,
      currency: "KWD",
      raw: {
        name: "صفوة",
        rateOptions: [
          {
            rateKey: "rk-1",
            roomName: "غرفة مزدوجة",
            boardName: "إفطار",
            net: 100,
            freeCancellation: true,
            cancellationPolicies: [{ amount: 40, from: "2026-11-18T23:59:00+03:00", currency: "KWD" }],
            rateComments: "لا يُسمح بالأطفال في هذه الغرفة.",
            promotions: [{ name: "عرض الإقامة", remark: "خصم الإقامة الطويلة" }],
            paymentType: "AT_WEB",
            taxes: {
              allIncluded: false,
              items: [{ type: "رسوم المنتجع", amount: 5, currency: "KWD", included: false }],
            },
          },
          {
            rateKey: "rk-2",
            roomName: "جناح",
            boardName: "غرفة فقط",
            net: 80,
            freeCancellation: false,
          },
        ],
      },
    });
    const refundable = rooms.find((room) => room.snapshot.roomName === "غرفة مزدوجة");
    const fixed = rooms.find((room) => room.snapshot.roomName === "جناح");
    assert.equal(refundLabel(refundable!), "مستردة حتى 18 نوفمبر 2026");
    assert.equal(refundLabel(fixed!), "غير مستردة");
    const terms = roomTermsText(rooms);
    assert.match(terms, /مستردة حتى 18 نوفمبر 2026/);
    assert.match(terms, /بعد 18 نوفمبر 2026 تُخصم 40 KWD/);
    assert.match(terms, /الشروط: لا يُسمح بالأطفال/);
    assert.match(terms, /ملاحظات: خصم الإقامة الطويلة/);
    assert.match(terms, /غير مستردة/);
    assert.match(terms, /لا توجد شروط إضافية من المورّد/);
    assert.match(terms, /رسوم غير مشمولة: رسوم المنتجع 5 KWD/);
    assert.match(terms, /الدفع مقدماً/);
    assert.match(holdCustomerMessage([refundable!]), /مستردة حتى 18 نوفمبر 2026/);
  });
});
