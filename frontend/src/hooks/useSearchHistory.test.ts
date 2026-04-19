import { renderHook, act } from '@testing-library/react';
import { useSearchHistory } from './useSearchHistory';

const IZAKAYA_STORAGE_KEY = 'restaurant_search_history';
const RAMEN_STORAGE_KEY = 'ramen_search_history';
const STORAGE_KEY = IZAKAYA_STORAGE_KEY;

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSearchHistory', () => {
  describe('初期化', () => {
    it('localStorage が空のとき空の履歴で初期化される', () => {
      const { result } = renderHook(() => useSearchHistory());
      expect(result.current.history).toEqual([]);
    });

    it('localStorage に有効なデータがあるときそれを読み込む', () => {
      const stored = [{ query: 'ラーメン' }, { query: '寿司' }];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

      const { result } = renderHook(() => useSearchHistory());
      expect(result.current.history).toEqual(stored);
    });

    it('localStorage に不正なJSONがあるとき空の履歴でフォールバックする', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');

      const { result } = renderHook(() => useSearchHistory());
      expect(result.current.history).toEqual([]);
    });

    it('localStorage.getItem が例外を投げるとき空の履歴でフォールバックする', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('localStorage unavailable');
      });

      const { result } = renderHook(() => useSearchHistory());
      expect(result.current.history).toEqual([]);
    });
  });

  describe('addToHistory', () => {
    it('クエリを履歴の先頭に追加する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });

      expect(result.current.history).toEqual([{ query: 'ラーメン' }]);
    });

    it('複数クエリを追加すると新しい順に並ぶ', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });
      act(() => {
        result.current.addToHistory('寿司');
      });

      expect(result.current.history[0]).toEqual({ query: '寿司' });
      expect(result.current.history[1]).toEqual({ query: 'ラーメン' });
    });

    it('空文字列は追加しない', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('');
      });

      expect(result.current.history).toEqual([]);
    });

    it('スペースのみのクエリは追加しない', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('   ');
      });

      expect(result.current.history).toEqual([]);
    });

    it('同一クエリが既存にある場合は削除して先頭に移動する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
        result.current.addToHistory('寿司');
        result.current.addToHistory('焼肉');
      });
      act(() => {
        result.current.addToHistory('ラーメン');
      });

      expect(result.current.history[0]).toEqual({ query: 'ラーメン' });
      expect(result.current.history).toHaveLength(3);
      expect(result.current.history.filter((e) => e.query === 'ラーメン')).toHaveLength(1);
    });

    it('10件を超えた場合は末尾を削除して10件を維持する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        for (let i = 1; i <= 11; i++) {
          result.current.addToHistory(`クエリ${i}`);
        }
      });

      expect(result.current.history).toHaveLength(10);
      expect(result.current.history[0]).toEqual({ query: 'クエリ11' });
      expect(result.current.history[9]).toEqual({ query: 'クエリ2' });
    });

    it('localStorage に永続化する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toEqual([{ query: 'ラーメン' }]);
    });

    it('localStorage 書き込み失敗時もステートは正常に更新される', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });

      expect(result.current.history).toEqual([{ query: 'ラーメン' }]);
    });
  });

  describe('removeFromHistory', () => {
    it('対象クエリを履歴から削除する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
        result.current.addToHistory('寿司');
      });
      act(() => {
        result.current.removeFromHistory('ラーメン');
      });

      expect(result.current.history).toEqual([{ query: '寿司' }]);
    });

    it('存在しないクエリを削除しようとしても履歴は変わらない', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });
      act(() => {
        result.current.removeFromHistory('存在しないクエリ');
      });

      expect(result.current.history).toEqual([{ query: 'ラーメン' }]);
    });

    it('削除後に localStorage を更新する', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
        result.current.addToHistory('寿司');
      });
      act(() => {
        result.current.removeFromHistory('ラーメン');
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      expect(stored).toEqual([{ query: '寿司' }]);
    });
  });

  describe('clearHistory', () => {
    it('全履歴を削除して空配列になる', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
        result.current.addToHistory('寿司');
      });
      act(() => {
        result.current.clearHistory();
      });

      expect(result.current.history).toEqual([]);
    });

    it('clearHistory 後に localStorage から削除される', () => {
      const { result } = renderHook(() => useSearchHistory());

      act(() => {
        result.current.addToHistory('ラーメン');
      });
      act(() => {
        result.current.clearHistory();
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('モード別キー管理', () => {
    it('izakaya モードは restaurant_search_history キーを使用する', () => {
      const { result } = renderHook(() => useSearchHistory('izakaya'));

      act(() => {
        result.current.addToHistory('長岡の居酒屋');
      });

      expect(localStorage.getItem(IZAKAYA_STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(RAMEN_STORAGE_KEY)).toBeNull();
    });

    it('ramen モードは ramen_search_history キーを使用する', () => {
      const { result } = renderHook(() => useSearchHistory('ramen'));

      act(() => {
        result.current.addToHistory('こってりラーメン');
      });

      expect(localStorage.getItem(RAMEN_STORAGE_KEY)).not.toBeNull();
      expect(localStorage.getItem(IZAKAYA_STORAGE_KEY)).toBeNull();
    });

    it('既存の restaurant_search_history データを izakaya として読み込む', () => {
      const existing = [{ query: '新潟の居酒屋' }];
      localStorage.setItem(IZAKAYA_STORAGE_KEY, JSON.stringify(existing));

      const { result } = renderHook(() => useSearchHistory('izakaya'));

      expect(result.current.history).toEqual(existing);
    });

    it('izakaya と ramen の履歴は独立している', () => {
      const izakayaData = [{ query: '居酒屋クエリ' }];
      const ramenData = [{ query: 'ラーメンクエリ' }];
      localStorage.setItem(IZAKAYA_STORAGE_KEY, JSON.stringify(izakayaData));
      localStorage.setItem(RAMEN_STORAGE_KEY, JSON.stringify(ramenData));

      const { result: izakayaResult } = renderHook(() => useSearchHistory('izakaya'));
      const { result: ramenResult } = renderHook(() => useSearchHistory('ramen'));

      expect(izakayaResult.current.history).toEqual(izakayaData);
      expect(ramenResult.current.history).toEqual(ramenData);
    });

    it('mode 切り替え時に対応するキーの履歴に切り替わる', () => {
      const izakayaData = [{ query: '居酒屋クエリ' }];
      const ramenData = [{ query: 'ラーメンクエリ' }];
      localStorage.setItem(IZAKAYA_STORAGE_KEY, JSON.stringify(izakayaData));
      localStorage.setItem(RAMEN_STORAGE_KEY, JSON.stringify(ramenData));

      const { result, rerender } = renderHook(
        (mode: 'izakaya' | 'ramen') => useSearchHistory(mode),
        { initialProps: 'izakaya' as const },
      );

      expect(result.current.history).toEqual(izakayaData);

      act(() => {
        rerender('ramen');
      });

      expect(result.current.history).toEqual(ramenData);
    });
  });
});
