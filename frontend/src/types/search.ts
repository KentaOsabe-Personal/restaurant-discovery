export type SearchRequest = {
  query: string;
};

export type SearchHistoryEntry = {
  query: string;
};

/** 推薦理由を持たない店舗候補の基底型 */
export type Candidate = {
  name: string;
  rating: number | null;
  price_level: string | null;
  address: string;
  google_maps_url: string;
};

/** AIが推薦した店舗（理由付き） */
export type Recommendation = Candidate & {
  reason: string;
};

/** AIが選定しなかった追加候補 */
export type OtherCandidate = Candidate;

export type ParsedConditions = {
  area: string | null;
  genre: string | null;
  price_level: string | null;
  keyword: string | null;
};

export type SearchResponse = {
  recommendations: Recommendation[];
  other_candidates: OtherCandidate[];
  parsed_conditions: ParsedConditions;
};

export type OmakaseMeta = {
  area_id: string;
  sub_area: string;
};

export type OmakaseResponse = SearchResponse & {
  omakase: OmakaseMeta;
};
