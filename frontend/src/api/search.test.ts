import { searchPlaces } from './search';
import type { SearchResponse } from '../types/search';

const mockSearchResponse: SearchResponse = {
  recommendations: [
    {
      name: 'テスト食堂',
      rating: 4.2,
      price_level: '¥¥',
      address: '東京都渋谷区1-1-1',
      google_maps_url: 'https://maps.google.com/?cid=123',
      reason: 'コスパが良い',
    },
  ],
  parsed_conditions: {
    area: '渋谷',
    genre: 'ランチ',
    price_level: null,
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchPlaces', () => {
  it('200 OK のとき SearchResponse を resolve する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(mockSearchResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    const result = await searchPlaces('渋谷のランチ');
    expect(result).toEqual(mockSearchResponse);
  });

  it('POST /api/search に正しいヘッダとボディでリクエストを送信する（デフォルト mode=izakaya）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchPlaces('渋谷のランチ');

    expect(fetchMock).toHaveBeenCalledWith('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '渋谷のランチ', mode: 'izakaya' }),
    });
  });

  it('mode=ramen を指定するとリクエストボディに mode: ramen が含まれる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchPlaces('新潟のラーメン', 'ramen');

    expect(fetchMock).toHaveBeenCalledWith('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '新潟のラーメン', mode: 'ramen' }),
    });
  });

  it('422 のとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'クエリが必要です' }), {
          status: 422,
        }),
      ),
    );

    await expect(searchPlaces('')).rejects.toThrow();
  });

  it('5xx のとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(null, { status: 502 }),
      ),
    );

    await expect(searchPlaces('渋谷のランチ')).rejects.toThrow();
  });

  it('ネットワークエラーのとき例外を throw する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(searchPlaces('渋谷のランチ')).rejects.toThrow('Failed to fetch');
  });

  it('travelTime を指定するとリクエストボディに travel_time が含まれる', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchPlaces('新潟のラーメン', 'ramen', 'within_1hour');

    expect(fetchMock).toHaveBeenCalledWith('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '新潟のラーメン', mode: 'ramen', travel_time: 'within_1hour' }),
    });
  });

  it('travelTime を指定しないとリクエストボディに travel_time キーが含まれない', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchPlaces('新潟のラーメン', 'ramen');

    expect(fetchMock).toHaveBeenCalledWith('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '新潟のラーメン', mode: 'ramen' }),
    });
  });
});
