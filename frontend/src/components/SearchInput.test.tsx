import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import SearchInput from './SearchInput';

// 制御コンポーネントのテスト用ラッパー（Task 2.1 / 2.2 / 4.2 で内部状態変化が必要なケースに使用）
function ControlledInput({ onSubmit, isLoading }: { onSubmit: (q: string) => void; isLoading?: boolean }) {
  const [value, setValue] = useState('');
  return <SearchInput value={value} onChange={setValue} onSubmit={onSubmit} isLoading={isLoading} />;
}

describe('SearchInput', () => {
  const mockOnSubmit = vi.fn();
  const mockOnChange = vi.fn();

  describe('制御コンポーネントのインターフェース (Task 2)', () => {
    it('value prop がテキストフィールドの表示値として使われる', () => {
      render(<SearchInput value="テスト入力" onChange={mockOnChange} onSubmit={mockOnSubmit} />);
      expect(screen.getByRole('textbox')).toHaveValue('テスト入力');
    });

    it('テキスト変更時に onChange が新しい値で呼ばれる', () => {
      const handleChange = vi.fn();
      render(<SearchInput value="" onChange={handleChange} onSubmit={mockOnSubmit} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '新しい値' } });
      expect(handleChange).toHaveBeenCalledWith('新しい値');
    });
  });

  describe('Task 1.2: テキスト入力フィールドとボタンの描画', () => {
    beforeEach(() => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} />);
    });

    it('input[type=text]を表示する', () => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('送信ボタンを表示する', () => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('テキストフィールドにプレースホルダーテキストを表示する', () => {
      expect(screen.getByPlaceholderText('古町の海鮮居酒屋など')).toBeInTheDocument();
    });

    it('ボタンに「探す」ラベルを表示する', () => {
      expect(screen.getByRole('button', { name: '探す' })).toBeInTheDocument();
    });

    it('input に aria-label 属性が設定されている', () => {
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label');
    });
  });

  describe('Task 2.1: テキスト入力の制御とボタン有効・無効制御', () => {
    beforeEach(() => {
      mockOnSubmit.mockClear();
      render(<ControlledInput onSubmit={mockOnSubmit} />);
    });

    it('初期状態でボタンが disabled である', () => {
      expect(screen.getByRole('button', { name: '探す' })).toBeDisabled();
    });

    it('テキスト入力後にボタンが enabled になる', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷のラーメン' } });
      expect(screen.getByRole('button', { name: '探す' })).toBeEnabled();
    });

    it('テキスト全削除後にボタンが disabled に戻る', () => {
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '渋谷のラーメン' } });
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByRole('button', { name: '探す' })).toBeDisabled();
    });

    it('空白のみ入力時はボタンが disabled を維持する', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
      expect(screen.getByRole('button', { name: '探す' })).toBeDisabled();
    });
  });

  describe('Task 2.2: フォーム送信コールバック', () => {
    beforeEach(() => {
      mockOnSubmit.mockClear();
      render(<ControlledInput onSubmit={mockOnSubmit} />);
    });

    it('有効な入力でフォーム送信すると onSubmit が入力値を引数として呼ばれる', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '渋谷のラーメン' } });
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).toHaveBeenCalledOnce();
      expect(mockOnSubmit).toHaveBeenCalledWith('渋谷のラーメン');
    });

    it('Enter キー相当のフォーム送信でも onSubmit が呼ばれる', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '新宿のそば' } });
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).toHaveBeenCalledOnce();
      expect(mockOnSubmit).toHaveBeenCalledWith('新宿のそば');
    });

    it('空入力時のフォーム送信では onSubmit が呼ばれない（ガード条件）', () => {
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Task 3: ローディング状態の制御', () => {
    beforeEach(() => {
      mockOnSubmit.mockClear();
    });

    it('isLoading=true のとき input が disabled になる', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('isLoading=true のとき button が disabled になる', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('isLoading=true のとき form に aria-busy="true" が付与される', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('search')).toHaveAttribute('aria-busy', 'true');
    });

    it('isLoading=true のとき button ラベルが「検索中...」になる', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('button', { name: '検索中...' })).toBeInTheDocument();
    });

    it('isLoading=true 時にフォーム送信しても onSubmit が呼ばれない', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('isLoading が false に変わると input が enabled になる', () => {
      const { rerender } = render(
        <SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />,
      );
      rerender(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={false} />);
      expect(screen.getByRole('textbox')).toBeEnabled();
    });
  });

  describe('Task 4.2: ボタンクリックによる送信のテスト', () => {
    beforeEach(() => {
      mockOnSubmit.mockClear();
      render(<ControlledInput onSubmit={mockOnSubmit} />);
    });

    it('有効な入力でボタンクリック時に onSubmit が入力値を引数として呼ばれる', () => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '銀座の寿司' } });
      fireEvent.click(screen.getByRole('button', { name: '探す' }));
      expect(mockOnSubmit).toHaveBeenCalledOnce();
      expect(mockOnSubmit).toHaveBeenCalledWith('銀座の寿司');
    });
  });

  describe('Task 4.3: ローディング状態とアクセシビリティのテスト', () => {
    beforeEach(() => {
      mockOnSubmit.mockClear();
    });

    it('isLoading=true のときボタンクリックしても onSubmit が呼ばれない', () => {
      render(<SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('isLoading が false に変わり入力がある場合はボタンが enabled へ戻る', () => {
      const { rerender } = render(
        <SearchInput value="" onChange={mockOnChange} onSubmit={mockOnSubmit} />,
      );
      rerender(<SearchInput value="池袋のカフェ" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={true} />);
      rerender(<SearchInput value="池袋のカフェ" onChange={mockOnChange} onSubmit={mockOnSubmit} isLoading={false} />);
      expect(screen.getByRole('button', { name: '探す' })).toBeEnabled();
    });
  });
});
