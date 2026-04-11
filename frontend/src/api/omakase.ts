import type { OmakaseResponse } from '../types/search';
import type { OmakaseAreaId } from '../config/omakaseAreas';

export async function fetchOmakase(areaId: OmakaseAreaId): Promise<OmakaseResponse> {
  const response = await fetch('/api/omakase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ area: areaId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  return response.json() as Promise<OmakaseResponse>;
}
