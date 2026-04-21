import type { OmakaseRequest, OmakaseResponse } from '../types/search';

export async function fetchOmakase(request: OmakaseRequest): Promise<OmakaseResponse> {
  const response = await fetch('/api/omakase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<OmakaseResponse>;
}
