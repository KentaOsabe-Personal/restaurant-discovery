import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { searchPlaces } from './api/search';
import { refinePlaces } from './api/refine';
import type { SearchResponse } from './types/search';

vi.mock('./api/search');
vi.mock('./api/refine');
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

describe('App - refine-recommendation統合', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  const baseRecommendation = {
    name: 'テストレストラン',
    rating: 4.5,
    price_level: null,
    address: '東京都渋谷区1-1-1',
    google_maps_url: 'https://maps.google.com/test',
    reason: 'おすすめ',
    lat: 35.6595,
    lng: 139.7004,
  };

  it('再レコメンド成功時に推薦結果・条件タグが更新される（Req 6.1）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [baseRecommendation],
      other_candidates: [],
      parsed_conditions: { area: '渋谷', genre: null, price_level: null, keyword: null },
    });
    vi.mocked(refinePlaces).mockResolvedValueOnce({
      recommendations: [{ ...baseRecommendation, name: '再推薦の店' }],
      other_candidates: [],
      parsed_conditions: { area: '渋谷', genre: null, price_level: null, keyword: '個室' },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('テストレストラン');

    fireEvent.change(screen.getByRole('textbox', { name: 'フィードバック入力' }), {
      target: { value: '個室があると良い' },
    });
    fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));

    await screen.findByText('再推薦の店');
    expect(screen.queryByText('テストレストラン')).toBeNull();
    expect(screen.getByText('キーワード: 個室')).toBeInTheDocument();
  });

  it('再レコメンドエラー時に既存の推薦結果が維持される（Req 7.3）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [baseRecommendation],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });
    vi.mocked(refinePlaces).mockRejectedValueOnce(new Error('HTTP error: 502'));

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('テストレストラン');

    fireEvent.change(screen.getByRole('textbox', { name: 'フィードバック入力' }), {
      target: { value: '個室があると良い' },
    });
    fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));

    await screen.findByText('HTTP error: 502');
    expect(screen.getByText('テストレストラン')).toBeInTheDocument();
  });

  it('再レコメンド後に「もっと見る」展開状態がリセットされる（Req 6.2）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [baseRecommendation],
      other_candidates: [
        {
          name: '候補A',
          rating: 4.0,
          price_level: null,
          address: '住所A',
          google_maps_url: 'https://maps.google.com/a',
          lat: null,
          lng: null,
        },
      ],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });
    vi.mocked(refinePlaces).mockResolvedValueOnce({
      recommendations: [{ ...baseRecommendation, name: '再推薦の店' }],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('テストレストラン');

    fireEvent.click(screen.getByRole('button', { name: 'もっと見る' }));
    expect(screen.getByText('候補A')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'フィードバック入力' }), {
      target: { value: '個室があると良い' },
    });
    fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));

    await screen.findByText('再推薦の店');
    expect(screen.queryByText('候補A')).toBeNull();
  });

  it('FeedbackInputはrecommendations0件のとき非表示になる（Req 1.4）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce(emptyResponse);

    render(<App />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷でイタリアン' } });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText(/見つかりません/);
    expect(screen.queryByRole('textbox', { name: 'フィードバック入力' })).toBeNull();
  });
});

describe('App - ramen-search-mode 結合テスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const ramenRecommendation = {
    name: 'テストラーメン店',
    rating: 4.2,
    price_level: null,
    address: '新潟市中央区1-1-1',
    google_maps_url: 'https://maps.google.com/ramen',
    reason: 'こってりで美味しい',
    lat: 37.9,
    lng: 139.0,
  };

  it('タブ切り替え: 居酒屋→ラーメンで検索結果リセットとおまかせボタン消失（Req 1.2, 1.4, 1.5）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [ramenRecommendation],
      other_candidates: [],
      parsed_conditions: { area: '長岡', genre: '居酒屋', price_level: null, keyword: null },
    });

    render(<App />);

    // 居酒屋タブでのおまかせボタン表示を確認
    expect(screen.getByRole('button', { name: '新潟駅前でおすすめ' })).toBeInTheDocument();

    // 居酒屋タブで検索して結果表示
    fireEvent.change(screen.getByRole('textbox', { name: 'レストラン検索' }), {
      target: { value: '長岡の居酒屋' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('テストラーメン店');

    // ラーメンタブに切り替え
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));

    // 検索結果がリセットされる
    expect(screen.queryByText('テストラーメン店')).toBeNull();
    // おまかせボタンが非表示になる
    expect(screen.queryByRole('button', { name: '新潟駅前でおすすめ' })).toBeNull();
  });

  it('ラーメン検索: 検索条件タグに「ラーメン」が表示される（Req 2.1, 2.4）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [],
      parsed_conditions: { area: '駅前', genre: 'ラーメン', price_level: null, keyword: '味噌' },
    });

    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'レストラン検索' }), {
      target: { value: '駅前で味噌ラーメン' },
    });
    fireEvent.submit(screen.getByRole('search'));

    await screen.findByText('ジャンル: ラーメン');
    expect(screen.getByText('エリア: 駅前')).toBeInTheDocument();
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledWith('駅前で味噌ラーメン', 'ramen', undefined);
  });

  it('ラーメンフィードバック: refinePlaces が mode=ramen で呼ばれる（Req 4.1）', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [ramenRecommendation],
      other_candidates: [],
      parsed_conditions: { area: '駅前', genre: 'ラーメン', price_level: null, keyword: null },
    });
    vi.mocked(refinePlaces).mockResolvedValueOnce({
      recommendations: [{ ...ramenRecommendation, name: '再推薦ラーメン店' }],
      other_candidates: [],
      parsed_conditions: { area: '駅前', genre: 'ラーメン', price_level: null, keyword: '細麺' },
    });

    render(<App />);

    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'レストラン検索' }), {
      target: { value: '駅前でラーメン' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('テストラーメン店');

    fireEvent.change(screen.getByRole('textbox', { name: 'フィードバック入力' }), {
      target: { value: '細麺が食べたい' },
    });
    fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));

    await screen.findByText('再推薦ラーメン店');
    expect(vi.mocked(refinePlaces)).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'ramen' }),
    );
  });

  it('検索履歴分離: ラーメン履歴は居酒屋タブに切り替えても表示されない（Req 5.1, 5.2）', async () => {
    localStorage.setItem(
      'restaurant_search_history',
      JSON.stringify([{ query: '居酒屋クエリ' }]),
    );

    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [],
      other_candidates: [],
      parsed_conditions: { area: null, genre: 'ラーメン', price_level: null, keyword: null },
    });

    render(<App />);

    // ラーメンタブに切り替えて検索
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'レストラン検索' }), {
      target: { value: 'ラーメンクエリ' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText(/見つかりません/);

    // 居酒屋タブに戻る
    fireEvent.click(screen.getByRole('tab', { name: '居酒屋・バー' }));

    // 居酒屋タブの既存履歴が表示される（useEffect による再読み込みを待つ）
    await screen.findByText('居酒屋クエリ');
    // ラーメンタブで検索したクエリは表示されない
    expect(screen.queryByText('ラーメンクエリ')).toBeNull();
  });

  it('後方互換: 居酒屋タブでの検索・フィードバックが mode=izakaya で動作する（Req 6.1, 6.3）', async () => {
    const izakayaRecommendation = {
      name: '居酒屋テスト',
      rating: 4.3,
      price_level: null,
      address: '新潟市中央区2-2-2',
      google_maps_url: 'https://maps.google.com/izakaya',
      reason: '雰囲気が良い',
      lat: 37.9,
      lng: 139.0,
    };

    vi.mocked(searchPlaces).mockResolvedValueOnce({
      recommendations: [izakayaRecommendation],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });
    vi.mocked(refinePlaces).mockResolvedValueOnce({
      recommendations: [{ ...izakayaRecommendation, name: '再推薦居酒屋' }],
      other_candidates: [],
      parsed_conditions: { area: null, genre: null, price_level: null, keyword: null },
    });

    render(<App />);

    // おまかせボタンが表示されることを確認
    expect(screen.getByRole('button', { name: '新潟駅前でおすすめ' })).toBeInTheDocument();

    // 居酒屋タブで検索
    fireEvent.change(screen.getByRole('textbox', { name: 'レストラン検索' }), {
      target: { value: '長岡の居酒屋' },
    });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText('居酒屋テスト');

    // mode=izakaya で searchPlaces が呼ばれることを確認
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledWith('長岡の居酒屋', 'izakaya', undefined);

    // フィードバックを送信
    fireEvent.change(screen.getByRole('textbox', { name: 'フィードバック入力' }), {
      target: { value: '個室があると良い' },
    });
    fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));
    await screen.findByText('再推薦居酒屋');

    // mode=izakaya で refinePlaces が呼ばれることを確認
    expect(vi.mocked(refinePlaces)).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'izakaya' }),
    );
  });
});

describe('App - distance-filter 統合 (Task 4.1)', () => {
  beforeEach(() => {
    vi.mocked(searchPlaces).mockResolvedValue(emptyResponse);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('ラーメンタブに切り替えると距離フィルターボタンが4つ表示される (Req 2.1)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    expect(screen.getByText('30分以内')).toBeInTheDocument();
    expect(screen.getByText('1時間以内')).toBeInTheDocument();
    expect(screen.getByText('1時間以上2時間以内')).toBeInTheDocument();
    expect(screen.getByText('距離指定なし')).toBeInTheDocument();
  });

  it('初期表示（居酒屋タブ）では距離フィルターボタンが表示されない (Req 2.2)', () => {
    render(<App />);
    expect(screen.queryByText('30分以内')).toBeNull();
    expect(screen.queryByText('1時間以内')).toBeNull();
  });

  it('ラーメンから居酒屋タブに切り替えると距離フィルターボタンが非表示になる (Req 2.2)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    expect(screen.getByText('30分以内')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '居酒屋・バー' }));
    expect(screen.queryByText('30分以内')).toBeNull();
  });

  it('距離フィルター選択状態で検索するとtravelTimeがsearchPlacesに渡される (Req 3.1)', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.click(screen.getByText('30分以内'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新潟のラーメン' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText(/見つかりません/);
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledWith('新潟のラーメン', 'ramen', 'within_30min');
  });

  it('距離指定なし（null）でラーメン検索するとtravelTimeがundefinedで渡される (Req 3.2)', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '新潟のラーメン' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText(/見つかりません/);
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledWith('新潟のラーメン', 'ramen', undefined);
  });

  it('タブ切替でdistanceFilterがリセットされ、再検索時にtravelTimeがundefinedになる (Req 2.4)', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.click(screen.getByText('1時間以内'));
    fireEvent.click(screen.getByRole('tab', { name: '居酒屋・バー' }));
    fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ラーメン検索' } });
    fireEvent.submit(screen.getByRole('search'));
    await screen.findByText(/見つかりません/);
    expect(vi.mocked(searchPlaces)).toHaveBeenCalledWith('ラーメン検索', 'ramen', undefined);
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

    const searchInput = screen.getByRole('textbox', { name: 'レストラン検索' });
    fireEvent.change(searchInput, { target: { value: '次の検索' } });
    fireEvent.submit(searchInput.closest('form')!);

    expect(screen.queryByText('レストランA')).toBeNull();
  });
});
