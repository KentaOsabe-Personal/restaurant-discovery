import type { OmakaseRequest, OmakaseResponse } from '../types/search';

export async function fetchOmakase(request: OmakaseRequest): Promise<OmakaseResponse> {
  const response = await fetch('/api/omakase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? `HTTP error: ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<OmakaseResponse>;
}
