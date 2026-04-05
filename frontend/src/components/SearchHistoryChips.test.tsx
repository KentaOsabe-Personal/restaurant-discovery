import { render, screen, fireEvent } from '@testing-library/react';
import SearchHistoryChips from './SearchHistoryChips';
import type { SearchHistoryEntry } from '../types/search';

const mockHistory: readonly SearchHistoryEntry[] = [
  { query: '新潟駅前の居酒屋' },
  { query: '古町でランチ' },
  { query: '長岡のラーメン' },
];

describe('SearchHistoryChips', () => {
  const mockOnSelect = vi.fn();
  const mockOnRemove = vi.fn();
  const mockOnClear = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnRemove.mockClear();
    mockOnClear.mockClear();
  });

  describe('空履歴時の非表示', () => {
    it('history が空のとき何もレンダリングされない', () => {
      const { container } = render(
        <SearchHistoryChips
          history={[]}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('チップの描画', () => {
    it('履歴の各クエリがチップとして表示される', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      expect(screen.getByText('新潟駅前の居酒屋')).toBeInTheDocument();
      expect(screen.getByText('古町でランチ')).toBeInTheDocument();
      expect(screen.getByText('長岡のラーメン')).toBeInTheDocument();
    });

    it('履歴が1件以上のとき「履歴クリア」ボタンが表示される', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      expect(screen.getByRole('button', { name: '履歴クリア' })).toBeInTheDocument();
    });
  });

  describe('チップクリック（再検索）', () => {
    it('チップクリックで onSelect が正しいクエリで呼ばれる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      fireEvent.click(screen.getByText('新潟駅前の居酒屋'));
      expect(mockOnSelect).toHaveBeenCalledOnce();
      expect(mockOnSelect).toHaveBeenCalledWith('新潟駅前の居酒屋');
    });
  });

  describe('個別削除（×ボタン）', () => {
    it('×ボタンクリックで onRemove が呼ばれる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      const removeButtons = screen.getAllByRole('button', { name: /×/ });
      fireEvent.click(removeButtons[0]);
      expect(mockOnRemove).toHaveBeenCalledOnce();
      expect(mockOnRemove).toHaveBeenCalledWith('新潟駅前の居酒屋');
    });

    it('×ボタンクリックで onSelect は呼ばれない', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      const removeButtons = screen.getAllByRole('button', { name: /×/ });
      fireEvent.click(removeButtons[0]);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('全件クリア', () => {
    it('クリアボタンクリックで onClear が呼ばれる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={false}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: '履歴クリア' }));
      expect(mockOnClear).toHaveBeenCalledOnce();
    });
  });

  describe('ローディング中の disabled', () => {
    it('isLoading=true のときチップが disabled になる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={true}
        />,
      );
      // チップボタン（クエリテキストを含むもの）が disabled であることを確認
      const chipButtons = screen
        .getAllByRole('button')
        .filter((btn) => !btn.textContent?.includes('履歴クリア') && !btn.textContent?.includes('×'));
      for (const btn of chipButtons) {
        expect(btn).toBeDisabled();
      }
    });

    it('isLoading=true のとき「履歴クリア」ボタンが disabled になる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={true}
        />,
      );
      expect(screen.getByRole('button', { name: '履歴クリア' })).toBeDisabled();
    });

    it('isLoading=true のとき×ボタンが disabled になる', () => {
      render(
        <SearchHistoryChips
          history={mockHistory}
          onSelect={mockOnSelect}
          onRemove={mockOnRemove}
          onClear={mockOnClear}
          isLoading={true}
        />,
      );
      for (const btn of screen.getAllByRole('button', { name: /×/ })) {
        expect(btn).toBeDisabled();
      }
    });
  });
});
