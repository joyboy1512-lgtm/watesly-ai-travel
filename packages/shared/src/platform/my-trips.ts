export type MyTripServiceStatus = "pending" | "confirmed" | "cancelled" | "none";

export type MyTrip = {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  totalMinor: number;
  paymentStatus: string;
  services: {
    flight: MyTripServiceStatus;
    hotel: MyTripServiceStatus;
    transfer: MyTripServiceStatus;
    activity: MyTripServiceStatus;
  };
  documents: {
    ticketUrl?: string;
    hotelVoucherUrl?: string;
    transferVoucherUrl?: string;
    activityVoucherUrl?: string;
    invoiceUrl?: string;
    itineraryUrl?: string;
  };
};

export type CheckoutSummary = {
  tripId: string;
  components: Array<{ kind: string; label: string; amountMinor: number }>;
  originalMinor: number;
  discountMinor: number;
  taxesMinor: number;
  feesMinor: number;
  pointsRedeemedMinor: number;
  finalMinor: number;
  currency: string;
  paymentStatus: string;
};
