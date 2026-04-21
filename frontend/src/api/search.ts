import type { SearchMode, SearchResponse, TravelTime } from '../types/search';

export async function searchPlaces(
  query: string,
  mode: SearchMode = 'izakaya',
  travelTime?: TravelTime,
): Promise<SearchResponse> {
  const body: Record<string, unknown> = { query, mode };
  if (travelTime !== undefined) {
    body.travel_time = travelTime;
  }

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}

