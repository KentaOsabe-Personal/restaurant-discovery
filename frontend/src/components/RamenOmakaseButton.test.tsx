import { render, screen, fireEvent } from '@testing-library/react';
import RamenOmakaseButton from './RamenOmakaseButton';

describe('RamenOmakaseButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe('ボタン描画', () => {
    it('ラーメンおまかせ用ラベルで単一ボタンが描画される', () => {
      render(<RamenOmakaseButton onClick={mockOnClick} isLoading={false} />);
      expect(screen.getByRole('button', { name: 'ラーメンをおまかせ' })).toBeInTheDocument();
    });
  });

  describe('有効・無効状態', () => {
    it('isLoading=false のときボタンが enabled になる', () => {
      render(<RamenOmakaseButton onClick={mockOnClick} isLoading={false} />);
      expect(screen.getByRole('button', { name: 'ラーメンをおまかせ' })).toBeEnabled();
    });

    it('isLoading=true のときボタンが disabled になる', () => {
      render(<RamenOmakaseButton onClick={mockOnClick} isLoading={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('クリックイベント', () => {
    it('クリックで onClick が呼ばれる', () => {
      render(<RamenOmakaseButton onClick={mockOnClick} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'ラーメンをおまかせ' }));
      expect(mockOnClick).toHaveBeenCalledOnce();
    });

    it('isLoading=true のクリックで onClick が呼ばれない', () => {
      render(<RamenOmakaseButton onClick={mockOnClick} isLoading={true} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
});
