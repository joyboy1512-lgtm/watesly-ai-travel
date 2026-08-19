export type HbActivityName = string | { content?: string };

export type HbActivityAmount = {
  paxType?: string;
  ageFrom?: number;
  ageTo?: number;
  amount?: number | string;
  boxOfficeAmount?: number | string;
};

export type HbActivityDuration = {
  value?: number;
  metric?: string;
};

export type HbActivityImageUrl = {
  resource?: string;
  sizeType?: string;
};

export type HbActivityImage = {
  urls?: HbActivityImageUrl[];
};

export type HbActivityContent = {
  name?: HbActivityName;
  summary?: HbActivityName | string;
  description?: HbActivityName | string;
  media?: { images?: HbActivityImage[] };
};

export type HbActivityModality = {
  code?: string;
  name?: HbActivityName;
  duration?: HbActivityDuration;
  amountsFrom?: HbActivityAmount[];
  freeCancellation?: boolean;
};

export type HbActivity = {
  code?: string;
  type?: string;
  name?: HbActivityName;
  currency?: string;
  amountsFrom?: HbActivityAmount[];
  modalities?: HbActivityModality[];
  content?: HbActivityContent;
  country?: {
    code?: string;
    name?: string;
    destinations?: Array<{ code?: string; name?: string }>;
  };
};

export type HbActivitySearchResponse = {
  operationId?: string;
  activities?: HbActivity[];
  error?: { message?: string; code?: string };
  errors?: Array<{ code?: string; text?: string }>;
  message?: string;
};
