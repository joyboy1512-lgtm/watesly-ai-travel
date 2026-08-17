/** Rich hotel display model — provider-agnostic UI shape. */

export type HotelBoardCode =
  | "RO"
  | "BB"
  | "HB"
  | "FB"
  | "AI"
  | "SC"
  | "DB"
  | string;

export type HotelRateOption = {
  rateKey: string;
  rateType: string;
  rateClass?: string;
  roomCode: string;
  roomName: string;
  boardCode: string;
  boardName: string;
  net: number;
  sellingRate?: number;
  currency: string;
  paymentType?: string;
  packaging?: boolean;
  allotment?: number;
  freeCancellation: boolean;
  cancellationPolicies: Array<{
    amount: number;
    currency: string;
    from: string;
  }>;
  taxes?: {
    allIncluded?: boolean;
    items: Array<{
      type?: string;
      amount: number;
      currency: string;
      included: boolean;
    }>;
  };
  promotions: Array<{ code?: string; name?: string; remark?: string }>;
  adults?: number;
  children?: number;
  rooms?: number;
  rateCommentsId?: string;
};

export type HotelRoomOption = {
  code: string;
  name: string;
  rates: HotelRateOption[];
};

export type HotelPropertyDetails = {
  provider: string;
  liveMode: boolean;
  hotelCode: string;
  name: string;
  nameEn?: string;
  stars?: number;
  categoryCode?: string;
  categoryName?: string;
  destinationCode?: string;
  destinationName?: string;
  zoneCode?: string;
  zoneName?: string;
  location?: string;
  neighborhood?: string;
  address?: string;
  latitude?: number | string;
  longitude?: number | string;
  currency: string;
  minRate?: number;
  maxRate?: number;
  nights: number;
  checkInDate: string;
  checkOutDate: string;
  /** Cheapest rate summary for list cards */
  board?: string;
  boardCode?: string;
  roomType?: string;
  roomCode?: string;
  rateType?: string;
  paymentType?: string;
  freeCancellation?: boolean;
  noPrepayment?: boolean;
  /** Full tree from provider */
  rooms: HotelRoomOption[];
  rateOptions: HotelRateOption[];
  boards: string[];
  boardCodes: HotelBoardCode[];
  paymentTypes: string[];
  rateTypes: string[];
  zones: string[];
  promotions: string[];
  /** Legacy/mock fields */
  rating?: number;
  reviewCount?: number;
  facilities?: string[];
  propertyType?: string;
  imageUrl?: string;
  roomsAvailable?: number;
  scenario?: string;
  [key: string]: unknown;
};

export const BOARD_LABELS_AR: Record<string, string> = {
  RO: "غرفة فقط",
  BB: "إفطار",
  HB: "نصف إقامة",
  FB: "إقامة كاملة",
  AI: "شامل كليًا",
  SC: "خدمة ذاتية",
  DB: "إفطار وعشاء",
};

export function boardLabelAr(code?: string, name?: string): string {
  if (code && BOARD_LABELS_AR[code]) return BOARD_LABELS_AR[code];
  if (name?.trim()) return name.trim();
  return code || "—";
}

export function paymentTypeLabelAr(type?: string): string {
  if (type === "AT_HOTEL") return "الدفع في الفندق";
  if (type === "AT_WEB") return "الدفع أونلاين";
  return type || "—";
}
