import { render, screen, fireEvent } from '@testing-library/react';
import FeedbackInput from './FeedbackInput';

describe('FeedbackInput', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  describe('空入力時の動作（Req 1.2）', () => {
    it('初期状態で送信ボタンが disabled である', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      expect(screen.getByRole('button', { name: '再レコメンド' })).toBeDisabled();
    });

    it('空白のみ入力時に送信ボタンが disabled を維持する', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } });
      expect(screen.getByRole('button', { name: '再レコメンド' })).toBeDisabled();
    });
  });

  describe('テキスト入力後の動作（Req 1.2）', () => {
    it('テキスト入力後に送信ボタンが enabled になる', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '個室があると良い' } });
      expect(screen.getByRole('button', { name: '再レコメンド' })).toBeEnabled();
    });

    it('テキスト全削除後に送信ボタンが disabled に戻る', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '個室があると良い' } });
      fireEvent.change(input, { target: { value: '' } });
      expect(screen.getByRole('button', { name: '再レコメンド' })).toBeDisabled();
    });
  });

  describe('isLoading=true 時の動作（Req 1.3）', () => {
    it('isLoading=true のときボタンが disabled である', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('isLoading=true のときボタンラベルが「絞り込み中...」になる', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('button', { name: '絞り込み中...' })).toBeInTheDocument();
    });

    it('isLoading=true のとき form に aria-busy="true" が付与される', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={true} />);
      expect(screen.getByRole('search')).toHaveAttribute('aria-busy', 'true');
    });

    it('isLoading=true 時にフォーム送信しても onSubmit が呼ばれない', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={true} />);
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('送信時の動作（onSubmit コールバック）', () => {
    it('有効な入力でフォーム送信すると onSubmit が入力値を引数として呼ばれる', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '個室があると良い' } });
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).toHaveBeenCalledOnce();
      expect(mockOnSubmit).toHaveBeenCalledWith('個室があると良い');
    });

    it('有効な入力でボタンクリック時に onSubmit が入力値を引数として呼ばれる', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'もっとカジュアルな雰囲気が良い' } });
      fireEvent.click(screen.getByRole('button', { name: '再レコメンド' }));
      expect(mockOnSubmit).toHaveBeenCalledOnce();
      expect(mockOnSubmit).toHaveBeenCalledWith('もっとカジュアルな雰囲気が良い');
    });

    it('空入力時のフォーム送信では onSubmit が呼ばれない（ガード条件）', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      fireEvent.submit(screen.getByRole('search'));
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('送信後の入力フィールドリセット', () => {
    it('フォーム送信後に入力フィールドが空にリセットされる', () => {
      render(<FeedbackInput onSubmit={mockOnSubmit} isLoading={false} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '個室があると良い' } });
      fireEvent.submit(screen.getByRole('search'));
      expect(input).toHaveValue('');
    });
  });
});
