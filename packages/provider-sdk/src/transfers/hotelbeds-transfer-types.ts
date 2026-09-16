/** Hotelbeds Transfers Booking API shapes (subset used by WeekendGate). */

export type HbTransferName = string | { content?: string; language?: string };

export type HbTransferPoint = {
  code?: string;
  description?: string | HbTransferName;
  type?: string;
};

export type HbTransferService = {
  id?: number | string;
  direction?: string;
  transferType?: string;
  vehicle?: { code?: string; name?: string | HbTransferName };
  category?: { code?: string; name?: string | HbTransferName };
  pickupInformation?: {
    from?: HbTransferPoint;
    to?: HbTransferPoint;
    date?: string;
    time?: string;
  };
  minPaxCapacity?: number;
  maxPaxCapacity?: number;
  content?: {
    images?: Array<{ url?: string; type?: string }>;
    transferDetailInfo?: Array<{
      id?: string;
      name?: string;
      description?: string;
    }>;
  };
  price?: {
    totalAmount?: number | string;
    netAmount?: number | string;
    currencyId?: string;
  };
  cancellationPolicies?: Array<{
    amount?: number | string;
    from?: string;
    currencyId?: string;
  }>;
  rateKey?: string;
  rateClass?: string;
};

export type HbTransferAvailabilityResponse = {
  search?: Record<string, unknown>;
  services?: HbTransferService[];
  error?: { message?: string; code?: string };
};
