import { render, screen, fireEvent } from '@testing-library/react';
import RecommendationList from './RecommendationList';
import type { Recommendation } from '../types/search';

const sampleRecommendations: Recommendation[] = [
  {
    name: 'レストランA',
    rating: 4.5,
    price_level: 'PRICE_LEVEL_MODERATE',
    address: '東京都新宿区1-1-1',
    google_maps_url: 'https://maps.google.com/?cid=1',
    reason: 'おすすめの理由A',
    lat: 35.6894,
    lng: 139.6917,
  },
  {
    name: 'レストランB',
    rating: 3.8,
    price_level: 'PRICE_LEVEL_INEXPENSIVE',
    address: '東京都渋谷区2-2-2',
    google_maps_url: 'https://maps.google.com/?cid=2',
    reason: 'おすすめの理由B',
    lat: null,
    lng: null,
  },
];

const defaultProps = {
  recommendations: sampleRecommendations,
  selectedGoogleMapsUrl: null as string | null,
  onSelect: vi.fn(),
};

describe('RecommendationList', () => {
  describe('Task 5: レスポンシブグリッドスタイリング', () => {
    it('<ul> にグリッドレイアウトクラスが適用される', () => {
      render(<RecommendationList {...defaultProps} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('grid');
      expect(list).toHaveClass('grid-cols-1');
      expect(list).toHaveClass('md:grid-cols-2');
      expect(list).toHaveClass('lg:grid-cols-3');
    });

    it('<ul> に gap-4 が適用される', () => {
      render(<RecommendationList {...defaultProps} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('gap-4');
    });

    it('<ul> に list-none と p-0 が適用される', () => {
      render(<RecommendationList {...defaultProps} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('list-none');
      expect(list).toHaveClass('p-0');
    });

    it('各 PlaceCard がリストアイテムとして表示される', () => {
      render(<RecommendationList {...defaultProps} />);
      expect(screen.getByText('レストランA')).toBeInTheDocument();
      expect(screen.getByText('レストランB')).toBeInTheDocument();
    });

    it('空配列の場合は <ul> のみレンダリングされる', () => {
      render(<RecommendationList {...defaultProps} recommendations={[]} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });

  describe('Task 3.2 (search-result-map): 選択状態props伝播', () => {
    it('selectedGoogleMapsUrl と一致するカードに ring-2 クラスが適用される', () => {
      const { container } = render(
        <RecommendationList
          {...defaultProps}
          selectedGoogleMapsUrl="https://maps.google.com/?cid=1"
        />
      );
      const listItems = container.querySelectorAll('li > div');
      expect(listItems[0]).toHaveClass('ring-2');
      expect(listItems[0]).toHaveClass('ring-orange-400');
      expect(listItems[1]).not.toHaveClass('ring-2');
    });

    it('selectedGoogleMapsUrl が null の場合はどのカードもハイライトされない', () => {
      const { container } = render(<RecommendationList {...defaultProps} selectedGoogleMapsUrl={null} />);
      const listItems = container.querySelectorAll('li > div');
      listItems.forEach((item) => {
        expect(item).not.toHaveClass('ring-2');
      });
    });

    it('カードクリックで onSelect が google_maps_url を引数として呼ばれる', () => {
      const onSelect = vi.fn();
      const { container } = render(<RecommendationList {...defaultProps} onSelect={onSelect} />);
      const firstCard = container.querySelector('li > div')!;
      fireEvent.click(firstCard);
      expect(onSelect).toHaveBeenCalledWith('https://maps.google.com/?cid=1');
    });
  });
});
