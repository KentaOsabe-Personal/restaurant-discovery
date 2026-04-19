import { render, screen, fireEvent } from '@testing-library/react';
import ModeTabs from './ModeTabs';
import type { SearchMode } from '../types/search';

describe('ModeTabs', () => {
  describe('タブ描画', () => {
    it('「居酒屋・バー」と「ラーメン」の2つのタブが表示される', () => {
      render(<ModeTabs activeTab="izakaya" onTabChange={() => {}} />);

      expect(screen.getByRole('tab', { name: '居酒屋・バー' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'ラーメン' })).toBeInTheDocument();
    });

    it('tablist ロールのコンテナが存在する', () => {
      render(<ModeTabs activeTab="izakaya" onTabChange={() => {}} />);
      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });
  });

  describe('アクティブ状態', () => {
    it('izakaya がアクティブのとき「居酒屋・バー」タブに aria-selected=true が設定される', () => {
      render(<ModeTabs activeTab="izakaya" onTabChange={() => {}} />);

      expect(screen.getByRole('tab', { name: '居酒屋・バー' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: 'ラーメン' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('ramen がアクティブのとき「ラーメン」タブに aria-selected=true が設定される', () => {
      render(<ModeTabs activeTab="ramen" onTabChange={() => {}} />);

      expect(screen.getByRole('tab', { name: 'ラーメン' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      expect(screen.getByRole('tab', { name: '居酒屋・バー' })).toHaveAttribute(
        'aria-selected',
        'false',
      );
    });

    it('アクティブタブはハイライトクラスを持つ', () => {
      render(<ModeTabs activeTab="izakaya" onTabChange={() => {}} />);

      const izakayaTab = screen.getByRole('tab', { name: '居酒屋・バー' });
      const ramenTab = screen.getByRole('tab', { name: 'ラーメン' });

      expect(izakayaTab.className).not.toEqual(ramenTab.className);
    });
  });

  describe('クリックコールバック', () => {
    it('「ラーメン」タブをクリックすると onTabChange("ramen") が呼ばれる', () => {
      const onTabChange = vi.fn<[SearchMode], void>();
      render(<ModeTabs activeTab="izakaya" onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole('tab', { name: 'ラーメン' }));

      expect(onTabChange).toHaveBeenCalledOnce();
      expect(onTabChange).toHaveBeenCalledWith('ramen');
    });

    it('「居酒屋・バー」タブをクリックすると onTabChange("izakaya") が呼ばれる', () => {
      const onTabChange = vi.fn<[SearchMode], void>();
      render(<ModeTabs activeTab="ramen" onTabChange={onTabChange} />);

      fireEvent.click(screen.getByRole('tab', { name: '居酒屋・バー' }));

      expect(onTabChange).toHaveBeenCalledOnce();
      expect(onTabChange).toHaveBeenCalledWith('izakaya');
    });
  });
});
