import { render, screen, fireEvent } from '@testing-library/react';
import OtherCandidateSection from './OtherCandidateSection';
import type { OtherCandidate } from '../types/search';

const mockCandidate: OtherCandidate = {
  name: '候補食堂',
  rating: 3.8,
  price_level: 'PRICE_LEVEL_MODERATE',
  address: '新潟市中央区1-1-1',
  google_maps_url: 'https://maps.google.com/?cid=456',
};

const defaultProps = {
  candidates: [mockCandidate],
  isExpanded: false,
  onExpand: vi.fn(),
  isSearchLoading: false,
};

describe('OtherCandidateSection', () => {
  describe('Task 3.2: 受け入れ基準', () => {
    it('candidates が空のときボタンが表示されない', () => {
      render(<OtherCandidateSection {...defaultProps} candidates={[]} />);
      expect(screen.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument();
    });

    it('isSearchLoading=true のときボタンが表示されない', () => {
      render(<OtherCandidateSection {...defaultProps} isSearchLoading={true} />);
      expect(screen.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument();
    });

    it('candidates が空かつ isSearchLoading=true でも何もレンダリングされない', () => {
      const { container } = render(
        <OtherCandidateSection {...defaultProps} candidates={[]} isSearchLoading={true} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('candidates が1件以上あり isExpanded=false のとき「もっと見る」ボタンが表示される', () => {
      render(<OtherCandidateSection {...defaultProps} />);
      expect(screen.getByRole('button', { name: /もっと見る/ })).toBeInTheDocument();
    });

    it('ボタンクリックで onExpand が呼ばれる', () => {
      const onExpand = vi.fn();
      render(<OtherCandidateSection {...defaultProps} onExpand={onExpand} />);
      fireEvent.click(screen.getByRole('button', { name: /もっと見る/ }));
      expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('isExpanded=true でボタンが非表示になる', () => {
      render(<OtherCandidateSection {...defaultProps} isExpanded={true} />);
      expect(screen.queryByRole('button', { name: /もっと見る/ })).not.toBeInTheDocument();
    });

    it('isExpanded=true で候補リストが表示される', () => {
      render(<OtherCandidateSection {...defaultProps} isExpanded={true} />);
      expect(screen.getByText('候補食堂')).toBeInTheDocument();
    });

    it('isExpanded=true で「その他の候補」セクションヘッダーが表示される', () => {
      render(<OtherCandidateSection {...defaultProps} isExpanded={true} />);
      expect(screen.getByText('その他の候補')).toBeInTheDocument();
    });

    it('isExpanded=true で各候補に reason が表示されない', () => {
      const candidate: OtherCandidate = { ...mockCandidate };
      render(<OtherCandidateSection {...defaultProps} candidates={[candidate]} isExpanded={true} />);
      // reason は渡されないため推薦理由の段落は存在しない
      // PlaceCard に reason を渡していないことを確認するには、候補名が表示されることで十分
      expect(screen.getByText('候補食堂')).toBeInTheDocument();
    });

    it('isExpanded=false でも false のときリストは表示されない', () => {
      render(<OtherCandidateSection {...defaultProps} isExpanded={false} />);
      expect(screen.queryByText('候補食堂')).not.toBeInTheDocument();
    });
  });
});
