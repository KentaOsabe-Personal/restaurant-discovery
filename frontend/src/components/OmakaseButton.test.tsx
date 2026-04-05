import { render, screen, fireEvent } from '@testing-library/react';
import OmakaseButton from './OmakaseButton';

const mockPresets = ['新潟市 今夜のおすすめ居酒屋', '古町 隠れ家的な店', '万代 コスパの良い飲み屋'];

describe('OmakaseButton', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('ボタン描画', () => {
    it('ボタンラベルに「おまかせ」が表示される', () => {
      render(<OmakaseButton presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getByRole('button', { name: 'おまかせ' })).toBeInTheDocument();
    });
  });

  describe('有効・無効状態', () => {
    it('isLoading=false かつ presets に要素があるとき、ボタンが enabled になる', () => {
      render(<OmakaseButton presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getByRole('button', { name: 'おまかせ' })).toBeEnabled();
    });

    it('isLoading=true のとき disabled 属性が付与される', () => {
      render(<OmakaseButton presets={mockPresets} onSelect={mockOnSelect} isLoading={true} />);
      expect(screen.getByRole('button', { name: 'おまかせ' })).toBeDisabled();
    });

    it('presets が空配列のとき disabled になる', () => {
      render(<OmakaseButton presets={[]} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getByRole('button', { name: 'おまかせ' })).toBeDisabled();
    });
  });

  describe('クリックイベント', () => {
    it('クリック時に onSelect がインデックス0のクエリで1回呼ばれる', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0);
      render(<OmakaseButton presets={mockPresets} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: 'おまかせ' }));
      expect(mockOnSelect).toHaveBeenCalledOnce();
      expect(mockOnSelect).toHaveBeenCalledWith('新潟市 今夜のおすすめ居酒屋');
      vi.restoreAllMocks();
    });

    it('disabled 状態でクリックしても onSelect が呼ばれない', () => {
      render(<OmakaseButton presets={mockPresets} onSelect={mockOnSelect} isLoading={true} />);
      fireEvent.click(screen.getByRole('button', { name: 'おまかせ' }));
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });
});
