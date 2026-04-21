import { render, screen, fireEvent } from '@testing-library/react';
import DistanceFilterButtons from './DistanceFilterButtons';
import type { TravelTime } from '../types/search';

describe('DistanceFilterButtons', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('ボタン描画', () => {
    it('4つのボタンが表示される', () => {
      render(<DistanceFilterButtons value={null} onChange={mockOnChange} />);
      expect(screen.getByRole('button', { name: '30分以内' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1時間以内' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1時間以上2時間以内' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '距離指定なし' })).toBeInTheDocument();
    });
  });

  describe('クリックイベント', () => {
    it('"30分以内" クリックで onChange が within_30min で呼ばれる', () => {
      render(<DistanceFilterButtons value={null} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button', { name: '30分以内' }));
      expect(mockOnChange).toHaveBeenCalledWith('within_30min' satisfies TravelTime);
    });

    it('"1時間以内" クリックで onChange が within_1hour で呼ばれる', () => {
      render(<DistanceFilterButtons value={null} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button', { name: '1時間以内' }));
      expect(mockOnChange).toHaveBeenCalledWith('within_1hour' satisfies TravelTime);
    });

    it('"1時間以上2時間以内" クリックで onChange が 1_to_2_hours で呼ばれる', () => {
      render(<DistanceFilterButtons value={null} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button', { name: '1時間以上2時間以内' }));
      expect(mockOnChange).toHaveBeenCalledWith('1_to_2_hours' satisfies TravelTime);
    });

    it('"距離指定なし" クリックで onChange が null で呼ばれる', () => {
      render(<DistanceFilterButtons value={'within_30min'} onChange={mockOnChange} />);
      fireEvent.click(screen.getByRole('button', { name: '距離指定なし' }));
      expect(mockOnChange).toHaveBeenCalledWith(null);
    });
  });

  describe('選択スタイル', () => {
    it('value=within_30min のとき "30分以内" ボタンが選択スタイルを持ち、他は非選択スタイル', () => {
      render(<DistanceFilterButtons value={'within_30min'} onChange={mockOnChange} />);
      const selectedButton = screen.getByRole('button', { name: '30分以内' });
      const otherButton = screen.getByRole('button', { name: '1時間以内' });
      expect(selectedButton.className).toContain('bg-orange-500');
      expect(otherButton.className).not.toContain('bg-orange-500');
    });

    it('value=null のとき "距離指定なし" ボタンが選択スタイルを持ち、他は非選択スタイル', () => {
      render(<DistanceFilterButtons value={null} onChange={mockOnChange} />);
      const selectedButton = screen.getByRole('button', { name: '距離指定なし' });
      const otherButton = screen.getByRole('button', { name: '30分以内' });
      expect(selectedButton.className).toContain('bg-orange-500');
      expect(otherButton.className).not.toContain('bg-orange-500');
    });
  });
});
