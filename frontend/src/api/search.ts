import type { SearchMode, SearchResponse } from '../types/search';

export async function searchPlaces(
  query: string,
  mode: SearchMode = 'izakaya',
): Promise<SearchResponse> {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<SearchResponse>;
}
