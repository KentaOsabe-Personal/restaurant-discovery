import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { searchPlaces } from './api/search';
import type { SearchResponse } from './types/search';

vi.mock('./api/search');

const emptyResponse: SearchResponse = {
  recommendations: [],
  parsed_conditions: { area: null, genre: null, price_level: null },
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
      parsed_conditions: { area: null, genre: null, price_level: null },
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
