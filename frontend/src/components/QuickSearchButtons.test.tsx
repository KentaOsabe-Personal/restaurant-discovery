import { render, screen, fireEvent } from '@testing-library/react';
import QuickSearchButtons from './QuickSearchButtons';
import type { QuickSearchPreset } from '../config/quickSearchPresets';

const mockPresets: readonly QuickSearchPreset[] = [
  { label: '駅前', query: '新潟駅前の居酒屋' },
  { label: '古町', query: '古町での居酒屋' },
  { label: '友達', query: '新潟市で友達と飲み会' },
];

describe('QuickSearchButtons', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('ボタン描画', () => {
    it('プリセット数と同数のボタンが描画される', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getAllByRole('button')).toHaveLength(mockPresets.length);
    });

    it('各ボタンに preset.label が表示テキストとして使われる', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getByRole('button', { name: '駅前' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '古町' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '友達' })).toBeInTheDocument();
    });

    it('プリセットが空配列のとき、ボタンが0件描画される', () => {
      render(<QuickSearchButtons presets={[]} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });
  });

  describe('有効・無効状態', () => {
    it('isLoading=false のとき全ボタンが enabled になる', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeEnabled();
      }
    });

    it('isLoading=true のとき全ボタンが disabled になる', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={true} />);
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
    });
  });

  describe('クリックイベント', () => {
    it('ボタンクリック時に onSelect(preset.query) が呼ばれる', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '駅前' }));
      expect(mockOnSelect).toHaveBeenCalledOnce();
      expect(mockOnSelect).toHaveBeenCalledWith('新潟駅前の居酒屋');
    });

    it('disabled 状態でクリックしても onSelect が呼ばれない', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={true} />);
      fireEvent.click(screen.getByRole('button', { name: '駅前' }));
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('それぞれのボタンが対応する query で onSelect を呼ぶ', () => {
      render(<QuickSearchButtons presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '友達' }));
      expect(mockOnSelect).toHaveBeenCalledWith('新潟市で友達と飲み会');
    });
  });
});
