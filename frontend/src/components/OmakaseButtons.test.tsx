import { render, screen, fireEvent } from '@testing-library/react';
import OmakaseButtons from './OmakaseButtons';
import type { OmakaseArea } from '../config/omakaseAreas';

const mockAreas: readonly OmakaseArea[] = [
  { id: 'ekimae', label: '新潟駅前でおすすめ' },
  { id: 'ekinan', label: '新潟駅南でおすすめ' },
  { id: 'furumachi', label: '古町でおすすめ' },
  { id: 'nagaoka', label: '長岡でおすすめ' },
];

describe('OmakaseButtons', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  describe('ボタン描画', () => {
    it('4つのエリアボタンが正しいラベルで描画される', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getByRole('button', { name: '新潟駅前でおすすめ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '新潟駅南でおすすめ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '古町でおすすめ' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '長岡でおすすめ' })).toBeInTheDocument();
    });

    it('areas の数と同数のボタンが描画される', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      expect(screen.getAllByRole('button')).toHaveLength(4);
    });
  });

  describe('有効・無効状態', () => {
    it('isLoading=false のとき全ボタンが enabled になる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeEnabled();
      }
    });

    it('isLoading=true のとき全ボタンが disabled になる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={true} />);
      for (const button of screen.getAllByRole('button')) {
        expect(button).toBeDisabled();
      }
    });
  });

  describe('クリックイベント', () => {
    it('各ボタンクリックで onSelect が対応する areaId で呼ばれる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '新潟駅前でおすすめ' }));
      expect(mockOnSelect).toHaveBeenCalledOnce();
      expect(mockOnSelect).toHaveBeenCalledWith('ekimae');
    });

    it('駅南ボタンクリックで onSelect が "ekinan" で呼ばれる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '新潟駅南でおすすめ' }));
      expect(mockOnSelect).toHaveBeenCalledWith('ekinan');
    });

    it('古町ボタンクリックで onSelect が "furumachi" で呼ばれる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '古町でおすすめ' }));
      expect(mockOnSelect).toHaveBeenCalledWith('furumachi');
    });

    it('長岡ボタンクリックで onSelect が "nagaoka" で呼ばれる', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={false} />);
      fireEvent.click(screen.getByRole('button', { name: '長岡でおすすめ' }));
      expect(mockOnSelect).toHaveBeenCalledWith('nagaoka');
    });

    it('isLoading=true のクリックで onSelect が呼ばれない', () => {
      render(<OmakaseButtons areas={mockAreas} onSelect={mockOnSelect} isLoading={true} />);
      fireEvent.click(screen.getByRole('button', { name: '新潟駅前でおすすめ' }));
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });
});
