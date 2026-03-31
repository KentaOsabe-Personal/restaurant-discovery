import { render, screen } from '@testing-library/react';
import PlaceCard from './PlaceCard';

const baseProps = {
  name: 'テスト食堂',
  rating: 4.2,
  price_level: 'PRICE_LEVEL_MODERATE',
  address: '東京都渋谷区1-1-1',
  google_maps_url: 'https://maps.google.com/?cid=123',
  reason: 'コスパが良くておすすめです',
};

describe('PlaceCard', () => {
  describe('Task 3.1: 基本表示・null 条件分岐', () => {
    it('name, address, reason が同時にレンダリングされる', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByText('テスト食堂')).toBeInTheDocument();
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeInTheDocument();
      expect(screen.getByText('コスパが良くておすすめです')).toBeInTheDocument();
    });

    it('rating が数値の場合は表示される', () => {
      render(<PlaceCard {...baseProps} rating={4.2} />);
      expect(screen.getByText('4.2')).toBeInTheDocument();
    });

    it('rating が null の場合は非表示', () => {
      render(<PlaceCard {...baseProps} rating={null} />);
      expect(screen.queryByText('4.2')).not.toBeInTheDocument();
    });

    it('price_level が文字列の場合は変換後に表示される', () => {
      render(<PlaceCard {...baseProps} price_level="PRICE_LEVEL_MODERATE" />);
      expect(screen.getByText('¥¥')).toBeInTheDocument();
    });

    it('price_level が null の場合は非表示', () => {
      render(<PlaceCard {...baseProps} price_level={null} />);
      expect(screen.queryByText('¥¥')).not.toBeInTheDocument();
    });
  });

  describe('Task 3.2: Google Maps リンク・アクセシビリティ', () => {
    beforeEach(() => {
      render(<PlaceCard {...baseProps} />);
    });

    it('google_maps_url が <a> の href に設定される', () => {
      expect(screen.getByRole('link')).toHaveAttribute('href', 'https://maps.google.com/?cid=123');
    });

    it('https:// 以外の URL は # にフォールバックされる（XSS 対策）', () => {
      render(<PlaceCard {...baseProps} google_maps_url="javascript:alert(1)" />);
      const links = screen.getAllByRole('link');
      expect(links[links.length - 1]).toHaveAttribute('href', '#');
    });

    it('target="_blank" が付与される', () => {
      expect(screen.getByRole('link')).toHaveAttribute('target', '_blank');
    });

    it('rel="noopener noreferrer" が付与される', () => {
      expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('リンクに意味のあるラベルテキストが表示される', () => {
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toBeInTheDocument();
    });

    it('店舗名が heading level 3 (<h3>) としてレンダリングされる', () => {
      expect(screen.getByRole('heading', { level: 3, name: 'テスト食堂' })).toBeInTheDocument();
    });
  });

  describe('Task 3.3: formatPriceLevel ユニットテスト', () => {
    it('PRICE_LEVEL_INEXPENSIVE → ¥', () => {
      render(<PlaceCard {...baseProps} price_level="PRICE_LEVEL_INEXPENSIVE" />);
      expect(screen.getByText('¥')).toBeInTheDocument();
    });

    it('PRICE_LEVEL_MODERATE → ¥¥', () => {
      render(<PlaceCard {...baseProps} price_level="PRICE_LEVEL_MODERATE" />);
      expect(screen.getByText('¥¥')).toBeInTheDocument();
    });

    it('PRICE_LEVEL_EXPENSIVE → ¥¥¥', () => {
      render(<PlaceCard {...baseProps} price_level="PRICE_LEVEL_EXPENSIVE" />);
      expect(screen.getByText('¥¥¥')).toBeInTheDocument();
    });

    it('PRICE_LEVEL_VERY_EXPENSIVE → ¥¥¥¥', () => {
      render(<PlaceCard {...baseProps} price_level="PRICE_LEVEL_VERY_EXPENSIVE" />);
      expect(screen.getByText('¥¥¥¥')).toBeInTheDocument();
    });

    it('null 入力は非表示（null を返す）', () => {
      render(<PlaceCard {...baseProps} price_level={null} />);
      expect(screen.queryByText(/^¥/)).not.toBeInTheDocument();
    });

    it('未知の入力値はそのまま表示される（フォールバック）', () => {
      render(<PlaceCard {...baseProps} price_level="UNKNOWN_PRICE" />);
      expect(screen.getByText('UNKNOWN_PRICE')).toBeInTheDocument();
    });
  });
});
