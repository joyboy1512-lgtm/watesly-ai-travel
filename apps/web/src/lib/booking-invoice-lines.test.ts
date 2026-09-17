import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookedQuoteItems,
  hotelConfirmation,
  invoiceSaleLines,
  ticketNumbers,
  type BookingInvoiceData,
} from "./booking-invoice-lines";

function flightAlts(): BookingInvoiceData {
  return {
    id: "bkg-1",
    status: "confirmed",
    providerBookingRef: "PNR-MOCK-DXB001",
    totalSellAmount: 145638,
    totalCostAmount: 120000,
    totalProfitAmount: 25638,
    createdAt: "2026-09-01T00:00:00.000Z",
    passengerDetails: {
      selectedQuoteItemId: "opt-cheap",
      serviceType: "flight",
      extras: { ticketNumbers: ["176-1234567890", "176-1234567891"] },
      travelers: [
        { firstName: "Ali", lastName: "Ahmad" },
        { firstName: "Sara", lastName: "Ahmad" },
      ],
      route: { origin: "KWI", destination: "DXB", departDate: "2026-10-01" },
    },
    quote: {
      currency: "KWD",
      items: [
        {
          id: "opt-cheap",
          serviceType: "flight",
          description: "Kuwait Airways KWI → DXB",
          sellAmount: 145638,
          costAmount: 120000,
          profitAmount: 25638,
        },
        {
          id: "opt-mid",
          serviceType: "flight",
          description: "Jazeera KWI → DXB",
          sellAmount: 167321,
          costAmount: 140000,
          profitAmount: 27321,
        },
        {
          id: "opt-high",
          serviceType: "flight",
          description: "Emirates KWI → DXB",
          sellAmount: 200778,
          costAmount: 170000,
          profitAmount: 30778,
        },
      ],
    },
  };
}

describe("booking invoice aggregation", () => {
  it("keeps only the selected fare, not quote alternatives", () => {
    const items = bookedQuoteItems(flightAlts());
    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, "opt-cheap");
    assert.equal(items[0]?.sellAmount, 145638);
  });

  it("splits customer sell per ticket and keeps booking + ticket numbers", () => {
    const lines = invoiceSaleLines(flightAlts());
    assert.equal(lines.length, 2);
    assert.deepEqual(
      lines.map((line) => line.ticketOrConfirm),
      ["176-1234567890", "176-1234567891"],
    );
    assert.ok(lines.every((line) => line.bookingRef === "PNR-MOCK-DXB001"));
    assert.equal(
      lines.reduce((sum, line) => sum + line.sellAmount, 0),
      145638,
    );
  });

  it("shows hotel confirmation and stay total, never a nightly rate", () => {
    const row: BookingInvoiceData = {
      id: "bkg-hotel",
      status: "confirmed",
      providerBookingRef: "HTL-MOCK-DXB55",
      totalSellAmount: 276000,
      totalCostAmount: 240000,
      totalProfitAmount: 36000,
      createdAt: "2026-09-01T00:00:00.000Z",
      passengerDetails: {
        selectedQuoteItemId: "stay-1",
        serviceType: "hotel",
        extras: {
          confirmationNo: "HB-998877",
          priceBreakdown: { perNightMinor: 92000, payNowMinor: 276000, nights: 3 },
        },
        stay: {
          location: "DXB",
          checkIn: "2026-10-01",
          checkOut: "2026-10-04",
        },
      },
      quote: {
        currency: "KWD",
        items: [
          {
            id: "stay-1",
            serviceType: "hotel",
            description: "دبي بلازا · 3 ليالٍ",
            sellAmount: 276000,
            costAmount: 240000,
            profitAmount: 36000,
          },
          {
            id: "stay-alt",
            serviceType: "hotel",
            description: "دبي مارينا · 3 ليالٍ",
            sellAmount: 410000,
            costAmount: 360000,
            profitAmount: 50000,
          },
        ],
      },
    };

    const lines = invoiceSaleLines(row);
    assert.equal(lines.length, 1);
    assert.equal(lines[0]?.kind, "hotel");
    assert.equal(lines[0]?.ticketOrConfirm, "HB-998877");
    assert.equal(lines[0]?.sellAmount, 276000);
    assert.notEqual(lines[0]?.sellAmount, 92000);
    assert.equal(hotelConfirmation(row), "HB-998877");
  });

  it("reads ticket numbers from extras and travelers", () => {
    const row: BookingInvoiceData = {
      id: "bkg-tix",
      status: "issued",
      providerBookingRef: "PNR-ABC",
      totalSellAmount: 1000,
      createdAt: "2026-09-01T00:00:00.000Z",
      passengerDetails: {
        extras: { ticketNo: "176-111" },
        travelers: [{ firstName: "A", ticketNumber: "176-222" }],
      },
    };
    assert.deepEqual(ticketNumbers(row), ["176-111", "176-222"]);
  });
});
