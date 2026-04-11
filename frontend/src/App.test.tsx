import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { searchPlaces } from './api/search';
import type { SearchResponse } from './types/search';

vi.mock('./api/search');
vi.mock('./components/MapPanel', () => ({
  default: ({
    candidates,
    onMarkerClick,
  }: {
    candidates: Array<{ google_maps_url: string; name: string }>;
    onMarkerClick: (url: string) => void;
  }) => (
    <div data-testid="map-panel">
      {candidates.map((c) => (
        <button key={c.google_maps_url} onClick={() => onMarkerClick(c.google_maps_url)}>
          マーカー: {c.name}
        </button>
      ))}
    </div>
  ),
}));

const emptyResponse: SearchResponse = {
  recommendations: [],
  other_candidates: [],
  parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
};

describe('App', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('成功シナリオ: 検索後に推薦店舗名がDOMに表示される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [
        {
          name: 'テストレストラン',
          rating: 4.5,
          price_level: 'PRICE_LEVEL_MODERATE',
          address: '東京都渋谷区テスト1-1-1',
          google_maps_url: 'https://maps.google.com/test',
          reason: '雰囲気が良くておすすめです',
          lat: 35.6595,
          lng: 139.7004,
        },
      ],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('テストレストラン');
  });

  it('空状態シナリオ: 空配列のとき空状態メッセージが表示される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce(emptyResponse);

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText(/見つかりません/);
  });

  it('エラーシナリオ: エラー時にエラーメッセージが表示され結果リストは非表示', async () => {
    vi.mocked(searchPlaces).mockRejectedValueOnce(new Error('HTTP error: 500'));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('HTTP error: 500');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('ローディング状態: フォーム送信後にSearchInputの入力フィールドが無効化される', async () => {
    let resolve!: () => void;
    vi.mocked(searchPlaces).mockReturnValueOnce(
      new Promise<SearchResponse>((res) => {
        resolve = () => res(emptyResponse);
      }),
    );

    render(<App />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(input).toBeDisabled();

    await act(async () => {
      resolve();
    });

    expect(input).not.toBeDisabled();
  });
});

describe('App - SearchConditionTags統合', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('検索成功後にSearchConditionTagsが表示される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [],
      parsed_conditions: { area: '渋谷', genre: 'イタリアン', price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('エリア: 渋谷');
    expect(screen.getByText('ジャンル: イタリアン')).toBeInTheDocument();
  });

  it('ローディング中はSearchConditionTagsが表示されない', async () => {
    let resolve!: () => void;
    vi.mocked(searchPlaces).mockReturnValueOnce(
      new Promise<SearchResponse>((res) => {
        resolve = () =>
          res({
            recommendations: [],
            other_candidates: [],
            parsed_conditions: { area: '渋谷', genre: null, price_level: null, keyword: null },
          });
      }),
    );

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.queryByText('エリア: 渋谷')).toBeNull();

    await act(async () => {
      resolve();
    });

    expect(screen.getByText('エリア: 渋谷')).toBeInTheDocument();
  });

  it('新しい検索開始時に前回のタグがクリアされる', async () => {
    vi.mocked(searchPlaces)
      .mockResolvedValueOnce({
        recommendations: [],
        other_candidates: [],
        parsed_conditions: { area: '渋谷', genre: null, price_level: null, keyword: null },
      })
      .mockReturnValueOnce(new Promise<SearchResponse>(() => {}));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('エリア: 渋谷');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新潟でラーメン' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.queryByText('エリア: 渋谷')).toBeNull();
  });
});

describe('App - OtherCandidateSection統合', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('検索成功後にother_candidatesがある場合「もっと見る」ボタンが表示される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [
        {
          name: '候補レストランA',
          rating: 4.0,
          price_level: 'PRICE_LEVEL_INEXPENSIVE',
          address: '東京都新宿区1-1-1',
          google_maps_url: 'https://maps.google.com/candidateA',
          lat: null,
          lng: null,
        },
      ],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新宿でランチ' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByRole('button', { name: 'もっと見る' });
  });

  it('新規検索開始時に「もっと見る」ボタンおよび候補リストがリセットされる', async () => {
    vi.mocked(searchPlaces)
      .mockResolvedValueOnce({
        recommendations: [],
        other_candidates: [
          {
            name: '候補レストランA',
            rating: 4.0,
            price_level: null,
            address: '東京都新宿区1-1-1',
            google_maps_url: 'https://maps.google.com/candidateA',
            lat: null,
            lng: null,
          },
        ],
        parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
      })
      .mockReturnValueOnce(new Promise<SearchResponse>(() => {}));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新宿でランチ' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByRole('button', { name: 'もっと見る' });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新潟でラーメン' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.queryByRole('button', { name: 'もっと見る' })).toBeNull();
  });

  it('検索エラー時にOtherCandidateSectionが表示されない', async () => {
    vi.mocked(searchPlaces).mockRejectedValueOnce(new Error('HTTP error: 500'));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新宿でランチ' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('HTTP error: 500');
    expect(screen.queryByRole('button', { name: 'もっと見る' })).toBeNull();
  });
});

describe('App - 2カラムレイアウトとMapPanel統合', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('検索前は地図パネルが表示されない', () => {
    render(<App />);
    expect(screen.queryByTestId('map-panel')).toBeNull();
  });

  it('recommendationsがある場合に地図パネルが表示される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [
        {
          name: 'テストレストラン',
          rating: 4.5,
          price_level: null,
          address: '東京都渋谷区1-1-1',
          google_maps_url: 'https://maps.google.com/test',
          reason: 'おすすめ',
          lat: 35.6595,
          lng: 139.7004,
        },
      ],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByTestId('map-panel');
  });

  it('0件の場合は地図パネルが表示されない', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText(/見つかりません/);
    expect(screen.queryByTestId('map-panel')).toBeNull();
  });

  it('推薦0件・other_candidatesあり場合は地図パネルが表示されない', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [
        {
          name: '候補A',
          rating: null,
          price_level: null,
          address: '住所A',
          google_maps_url: 'https://maps.google.com/a',
          lat: null,
          lng: null,
        },
      ],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByRole('button', { name: 'もっと見る' });
    expect(screen.queryByTestId('map-panel')).toBeNull();
  });
});

describe('App - 選択状態管理', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('PlaceCardクリックで対応するカードがハイライトされる', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [
        {
          name: 'テストレストラン',
          rating: 4.5,
          price_level: null,
          address: '東京都渋谷区1-1-1',
          google_maps_url: 'https://maps.google.com/test',
          reason: 'おすすめ',
          lat: 35.6595,
          lng: 139.7004,
        },
      ],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('テストレストラン');

    const card = screen.getByText('テストレストラン').closest('div.bg-white');
    expect(card).not.toHaveClass('ring-2');

    fireEvent.click(card!);

    expect(card).toHaveClass('ring-2');
    expect(card).toHaveClass('ring-orange-400');
  });

  it('other候補のマーカークリックでOtherCandidateSectionが自動展開される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [
        {
          name: 'おすすめA',
          rating: 4.5,
          price_level: null,
          address: '住所A',
          google_maps_url: 'https://maps.google.com/a',
          reason: 'おすすめ理由',
          lat: 35.6595,
          lng: 139.7004,
        },
      ],
      other_candidates: [
        {
          name: '候補B',
          rating: 4.0,
          price_level: null,
          address: '住所B',
          google_maps_url: 'https://maps.google.com/b',
          lat: 35.66,
          lng: 139.71,
        },
      ],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'テスト検索' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('おすすめA');
    expect(screen.getByRole('button', { name: 'もっと見る' })).toBeInTheDocument();
    expect(screen.queryByText('候補B')).toBeNull();

    fireEvent.click(screen.getByText('マーカー: 候補B'));

    await screen.findByText('候補B');
    expect(screen.queryByRole('button', { name: 'もっと見る' })).toBeNull();
  });

  it('新規検索時に選択状態がリセットされる', async () => {
    vi.mocked(searchPlaces)
      .mockResolvedValueOnce({
        recommendations: [
          {
            name: 'レストランA',
            rating: 4.5,
            price_level: null,
            address: '住所A',
            google_maps_url: 'https://maps.google.com/a',
            reason: '理由',
            lat: 35.6595,
            lng: 139.7004,
          },
        ],
        other_candidates: [],
        parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
      })
      .mockReturnValueOnce(new Promise<SearchResponse>(() => {}));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '最初の検索' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('レストランA');

    const card = screen.getByText('レストランA').closest('div.bg-white');
    fireEvent.click(card!);
    expect(card).toHaveClass('ring-2');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '次の検索' } });
    fireEvent.submit(screen.getByRole('search'));

    expect(screen.queryByText('レストランA')).toBeNull();
  });
});
