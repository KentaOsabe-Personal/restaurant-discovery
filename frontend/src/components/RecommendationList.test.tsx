import { render, screen } from '@testing-library/react';
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
  },
  {
    name: 'レストランB',
    rating: 3.8,
    price_level: 'PRICE_LEVEL_INEXPENSIVE',
    address: '東京都渋谷区2-2-2',
    google_maps_url: 'https://maps.google.com/?cid=2',
    reason: 'おすすめの理由B',
  },
];

describe('RecommendationList', () => {
  describe('Task 5: レスポンシブグリッドスタイリング', () => {
    it('<ul> にグリッドレイアウトクラスが適用される', () => {
      render(<RecommendationList recommendations={sampleRecommendations} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('grid');
      expect(list).toHaveClass('grid-cols-1');
      expect(list).toHaveClass('md:grid-cols-2');
      expect(list).toHaveClass('lg:grid-cols-3');
    });

    it('<ul> に gap-4 が適用される', () => {
      render(<RecommendationList recommendations={sampleRecommendations} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('gap-4');
    });

    it('<ul> に list-none と p-0 が適用される', () => {
      render(<RecommendationList recommendations={sampleRecommendations} />);
      const list = screen.getByRole('list');
      expect(list).toHaveClass('list-none');
      expect(list).toHaveClass('p-0');
    });

    it('各 PlaceCard がリストアイテムとして表示される', () => {
      render(<RecommendationList recommendations={sampleRecommendations} />);
      expect(screen.getByText('レストランA')).toBeInTheDocument();
      expect(screen.getByText('レストランB')).toBeInTheDocument();
    });

    it('空配列の場合は <ul> のみレンダリングされる', () => {
      render(<RecommendationList recommendations={[]} />);
      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
    });
  });
});
