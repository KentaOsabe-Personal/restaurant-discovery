export type SearchRequest = {
  query: string;
};

export type SearchHistoryEntry = {
  query: string;
};

export type Recommendation = {
  name: string;
  rating: number | null;
  price_level: string | null;
  address: string;
  google_maps_url: string;
  reason: string;
};

export type ParsedConditions = {
  area: string | null;
  genre: string | null;
  price_level: string | null;
  keyword: string | null;
};

export type SearchResponse = {
  recommendations: Recommendation[];
  parsed_conditions: ParsedConditions;
};
