export type HbContentText = { content?: string };

export type HbContentImage = {
  imageTypeCode?: string;
  path?: string;
  order?: number;
  visualOrder?: number;
  roomCode?: string;
  roomType?: string;
  characteristicCode?: string;
};

export type HbContentFacility = {
  facilityCode?: number;
  facilityGroupCode?: number;
  indLogic?: boolean;
  indYesOrNo?: boolean;
  indFee?: boolean;
  number?: number;
  voucher?: boolean;
  description?: HbContentText;
};

export type HbContentRoom = {
  roomCode?: string;
  roomType?: string;
  characteristicCode?: string;
  description?: HbContentText;
  roomFacilities?: HbContentFacility[];
};

export type HbContentHotel = {
  code?: number;
  name?: HbContentText;
  description?: HbContentText;
  ranking?: number;
  coordinates?: { latitude?: number; longitude?: number };
  address?: HbContentText & { street?: string; number?: string };
  city?: HbContentText;
  images?: HbContentImage[];
  facilities?: HbContentFacility[];
  rooms?: HbContentRoom[];
  categoryCode?: string;
};

export type HbContentHotelsResponse = {
  hotels?: HbContentHotel[];
  error?: { message?: string };
};
