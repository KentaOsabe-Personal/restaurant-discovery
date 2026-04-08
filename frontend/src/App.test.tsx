import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { searchPlaces } from './api/search';
import type { SearchResponse } from './types/search';

vi.mock('./api/search');

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

describe('App - クイック検索統合', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('クイック検索ボタンクリック後、テキストフィールドにクエリが反映される', async () => {
    vi.mocked(searchPlaces).mockResolvedValueOnce(emptyResponse);

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '駅前' }));

    expect(screen.getByRole('textbox')).toHaveValue('新潟駅前の居酒屋');

    await screen.findByText(/見つかりません/);
  });

  it('クイック検索ボタンクリック後、検索が実行されてローディング状態に遷移する', async () => {
    let resolve!: () => void;
    vi.mocked(searchPlaces).mockReturnValueOnce(
      new Promise<SearchResponse>((res) => {
        resolve = () => res(emptyResponse);
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '駅前' }));

    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByText('読み込み中...')).toBeInTheDocument();

    await act(async () => {
      resolve();
    });

    expect(screen.getByRole('textbox')).not.toBeDisabled();
  });

  it('ローディング中はクイック検索ボタンが全て disabled になり、完了後に enabled に戻る', async () => {
    let resolve!: () => void;
    vi.mocked(searchPlaces).mockReturnValueOnce(
      new Promise<SearchResponse>((res) => {
        resolve = () => res(emptyResponse);
      }),
    );

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '駅前' }));

    const quickButtons = ['駅前', '駅南', '古町', '友達', '一人飲み', 'デート'];
    quickButtons.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    });

    await act(async () => {
      resolve();
    });

    quickButtons.forEach((label) => {
      expect(screen.getByRole('button', { name: label })).toBeEnabled();
    });
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
