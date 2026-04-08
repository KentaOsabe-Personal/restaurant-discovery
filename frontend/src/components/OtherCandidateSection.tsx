import type { OtherCandidate } from '../types/search';
import PlaceCard from './PlaceCard';

interface OtherCandidateSectionProps {
  candidates: OtherCandidate[];
  isExpanded: boolean;
  onExpand: () => void;
  isSearchLoading: boolean;
}

function OtherCandidateSection({ candidates, isExpanded, onExpand, isSearchLoading }: OtherCandidateSectionProps) {
  if (candidates.length === 0 || isSearchLoading) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="mt-4 text-center">
        <button
          onClick={onExpand}
          className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
        >
          もっと見る
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3">その他の候補</h2>
      <div className="flex flex-col gap-4">
        {candidates.map((candidate) => (
          <PlaceCard key={candidate.google_maps_url} {...candidate} />
        ))}
      </div>
    </div>
  );
}

export default OtherCandidateSection;
