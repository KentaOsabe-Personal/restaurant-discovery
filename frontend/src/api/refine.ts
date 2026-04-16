import type { RefineRequest, RefineResponse } from '../types/search';

export async function refinePlaces(request: RefineRequest): Promise<RefineResponse> {
  const response = await fetch('/api/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<RefineResponse>;
}
