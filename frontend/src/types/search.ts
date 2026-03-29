export type SearchRequest = {
  query: string;
};

export type OpeningHours = {
  open_now: boolean;
  weekday_text: string[];
};

export type Recommendation = {
  name: string;
  rating: number | null;
  price_level: string | null;
  address: string;
  google_maps_url: string;
  photo_url: string | null;
  opening_hours: OpeningHours | null;
  reason: string;
};

export type ParsedConditions = {
  area: string | null;
  genre: string | null;
  price_level: string | null;
};

export type SearchResponse = {
  recommendations: Recommendation[];
  parsed_conditions: ParsedConditions;
};
