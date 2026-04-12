import { render, screen, fireEvent } from '@testing-library/react';
import PlaceCard from './PlaceCard';

const baseProps = {
  name: 'テスト食堂',
  rating: 4.2,
  price_level: 'PRICE_LEVEL_MODERATE',
  address: '東京都渋谷区1-1-1',
  google_maps_url: 'https://maps.google.com/?cid=123',
  reason: 'コスパが良くておすすめです',
  lat: null,
  lng: null,
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
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toHaveAttribute('href', 'https://maps.google.com/?cid=123');
    });

    it('https:// 以外の URL は # にフォールバックされる（XSS 対策）', () => {
      render(<PlaceCard {...baseProps} google_maps_url="javascript:alert(1)" />);
      expect(screen.getAllByRole('link', { name: 'Google Mapsで見る' })[1]).toHaveAttribute('href', '#');
    });

    it('target="_blank" が付与される', () => {
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toHaveAttribute('target', '_blank');
    });

    it('rel="noopener noreferrer" が付与される', () => {
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('リンクに意味のあるラベルテキストが表示される', () => {
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toBeInTheDocument();
    });

    it('店舗名が heading level 3 (<h3>) としてレンダリングされる', () => {
      expect(screen.getByRole('heading', { level: 3, name: 'テスト食堂' })).toBeInTheDocument();
    });
  });

  describe('食べログリンク Task 3.1: 表示・非表示の基本ケース', () => {
    it('通常の店名が与えられた場合に「食べログで見る」リンクが表示される', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByRole('link', { name: '食べログで見る' })).toBeInTheDocument();
    });

    it('空文字の店名の場合に食べログリンクが表示されない', () => {
      render(<PlaceCard {...baseProps} name="" />);
      expect(screen.queryByRole('link', { name: '食べログで見る' })).not.toBeInTheDocument();
    });

    it('空白のみの店名の場合に食べログリンクが表示されない', () => {
      render(<PlaceCard {...baseProps} name="   " />);
      expect(screen.queryByRole('link', { name: '食べログで見る' })).not.toBeInTheDocument();
    });

    it('Google Maps リンクと食べログリンクが同時に表示される', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: '食べログで見る' })).toBeInTheDocument();
    });
  });

  describe('食べログリンク Task 3.2: 属性と URL エンコード', () => {
    it('食べログリンクに target="_blank" が付与される', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByRole('link', { name: '食べログで見る' })).toHaveAttribute('target', '_blank');
    });

    it('食べログリンクに rel="noopener noreferrer" が付与される', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByRole('link', { name: '食べログで見る' })).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('日本語店名が encodeURIComponent でエンコードされた URL が href に設定される', () => {
      render(<PlaceCard {...baseProps} name="居酒屋" />);
      expect(screen.getByRole('link', { name: '食べログで見る' })).toHaveAttribute(
        'href',
        `https://tabelog.com/niigata/rstLst/?vs=1&sw=${encodeURIComponent('居酒屋')}`
      );
    });
  });

  describe('Task 2.2 (load-more): reason optional', () => {
    it('reason を省略した場合は推薦理由の段落が表示されない', () => {
      const { reason: _reason, ...propsWithoutReason } = baseProps;
      render(<PlaceCard {...propsWithoutReason} />);
      expect(screen.queryByText('コスパが良くておすすめです')).not.toBeInTheDocument();
    });

    it('reason を省略しても他の要素（name, address, links）は表示される', () => {
      const { reason: _reason, ...propsWithoutReason } = baseProps;
      render(<PlaceCard {...propsWithoutReason} />);
      expect(screen.getByText('テスト食堂')).toBeInTheDocument();
      expect(screen.getByText('東京都渋谷区1-1-1')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Google Mapsで見る' })).toBeInTheDocument();
    });

    it('reason が指定された場合は推薦理由が表示される', () => {
      render(<PlaceCard {...baseProps} />);
      expect(screen.getByText('コスパが良くておすすめです')).toBeInTheDocument();
    });
  });

  describe('Task 3.1 (search-result-map): 選択状態props', () => {
    it('isSelected=true のとき ring-2 と ring-orange-400 クラスが適用される', () => {
      const { container } = render(<PlaceCard {...baseProps} isSelected={true} />);
      expect(container.firstChild).toHaveClass('ring-2');
      expect(container.firstChild).toHaveClass('ring-orange-400');
    });

    it('isSelected=false のとき ring クラスが適用されない', () => {
      const { container } = render(<PlaceCard {...baseProps} isSelected={false} />);
      expect(container.firstChild).not.toHaveClass('ring-2');
    });

    it('isSelected が省略されたとき ring クラスが適用されない', () => {
      const { container } = render(<PlaceCard {...baseProps} />);
      expect(container.firstChild).not.toHaveClass('ring-2');
    });

    it('onSelect が渡されたときカードクリックでコールバックが呼ばれる', () => {
      const onSelect = vi.fn();
      const { container } = render(<PlaceCard {...baseProps} onSelect={onSelect} />);
      fireEvent.click(container.firstChild!);
      expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('onSelect が省略されたときクリックしてもエラーが発生しない', () => {
      const { container } = render(<PlaceCard {...baseProps} />);
      expect(() => fireEvent.click(container.firstChild!)).not.toThrow();
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
