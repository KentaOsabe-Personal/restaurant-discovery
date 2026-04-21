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
      lat: null,
      lng: null,
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
  describe('izakaya モード（area 指定）', () => {
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

      const result = await fetchOmakase({ area: 'ekimae' });
      expect(result).toEqual(mockOmakaseResponse);
    });

    it('POST /api/omakase に area を含む body でリクエストを送信する', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockOmakaseResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await fetchOmakase({ area: 'ekimae' });

      expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'ekimae' }),
      });
    });

    it('別エリア (ekinan) でリクエストボディに area: "ekinan" を送信する', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ ...mockOmakaseResponse, omakase: { area_id: 'ekinan', sub_area: 'けやき通り' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);

      await fetchOmakase({ area: 'ekinan' });

      expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'ekinan' }),
      });
    });
  });

  describe('ramen モード', () => {
    const ramenResponse: OmakaseResponse = {
      ...mockOmakaseResponse,
      parsed_conditions: { area: '新潟東区', genre: 'ラーメン', price_level: null, keyword: null },
      omakase: { area_id: 'niigata_higashi', sub_area: '新潟東区', mode: 'ramen', travel_time: 'within_30min' },
    };

    it('travel_time 指定で mode: ramen と travel_time を body に送信する', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ramenResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await fetchOmakase({ mode: 'ramen', travel_time: 'within_30min' });

      expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ramen', travel_time: 'within_30min' }),
      });
    });

    it('travel_time 未指定で mode: ramen のみを body に送信する', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ramenResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      await fetchOmakase({ mode: 'ramen' });

      expect(fetchMock).toHaveBeenCalledWith('/api/omakase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ramen' }),
      });
    });

    it('200 OK のとき OmakaseResponse を resolve する', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify(ramenResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      );

      const result = await fetchOmakase({ mode: 'ramen', travel_time: 'within_1hour' });
      expect(result).toEqual(ramenResponse);
    });
  });

  describe('エラーハンドリング', () => {
    it('422 のとき JSON error message を優先して例外を throw する', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ error: '条件に合うラーメン激戦区がありません' }), { status: 422 }),
        ),
      );

      await expect(fetchOmakase({ mode: 'ramen' })).rejects.toThrow('条件に合うラーメン激戦区がありません');
    });

    it('502 のとき例外を throw する', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })));

      await expect(fetchOmakase({ mode: 'ramen' })).rejects.toThrow('HTTP error: 502');
    });

    it('ネットワークエラーのとき例外を throw する', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

      await expect(fetchOmakase({ area: 'ekimae' })).rejects.toThrow('Failed to fetch');
    });
  });
});
