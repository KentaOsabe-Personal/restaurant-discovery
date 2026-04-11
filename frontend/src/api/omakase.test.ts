import { fetchOmakase } from './omakase';
import type { OmakaseResponse } from '../types/search';

const mockOmakaseResponse: OmakaseResponse = {
  recommendations: [
    {
      name: '居酒屋 万代 花太郎',
      rating: 4.2,
      price_level: 'PRICE_LEVEL_MODERATE',
      address: '新潟市中央区万代1-1-1',
      google_maps_url: 'https://maps.google.com/?cid=123',
      reason: '万代エリアで評価が高い居酒屋です',
    },
  ],
  other_candidates: [],
  parsed_conditions: {
    area: '新潟市中央区 万代',
    genre: '居酒屋 バー',
    price_level: null,
    keyword: null,
  },
  omakase: {
    area_id: 'ekimae',
    sub_area: '万代',
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchOmakase', () => {
  it('200 OK のとき OmakaseResponse を resolve する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockOmakaseResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await fetchOmakase('ekimae');
    expect(result).toEqual(mockOmakaseResponse);
  });

  it('POST /api/omakase に正しいエンドポイント・ヘッダー・ボディでリクエストを送信する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockOmakaseResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmakase('ekimae');

    expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: 'ekimae' }),
    });
  });

  it('別エリア (ekinan) でリクエストボディに area: "ekinan" を送信する', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ...mockOmakaseResponse, omakase: { area_id: 'ekinan', sub_area: 'けやき通り' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await fetchOmakase('ekinan');

    expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area: 'ekinan' }),
    });
  });

  it('422 のとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'area must be a non-empty string' }), {
          status: 422,
        }),
      ),
    );

    await expect(fetchOmakase('ekimae')).rejects.toThrow('HTTP error: 422');
  });

  it('502 のとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, { status: 502 }),
      ),
    );

    await expect(fetchOmakase('ekimae')).rejects.toThrow('HTTP error: 502');
  });

  it('ネットワークエラーのとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(fetchOmakase('ekimae')).rejects.toThrow('Failed to fetch');
  });
});
