import type { Recommendation } from '../types/search';
import PlaceCard from './PlaceCard';

interface RecommendationListProps {
  recommendations: Recommendation[];
  selectedGoogleMapsUrl: string | null;
  onSelect: (url: string) => void;
}

function RecommendationList({ recommendations, selectedGoogleMapsUrl, onSelect }: RecommendationListProps) {
  return (
    <ul className="list-none p-0 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {recommendations.map((item) => (
        <li key={item.google_maps_url}>
          <PlaceCard
            {...item}
            isSelected={item.google_maps_url === selectedGoogleMapsUrl}
            onSelect={() => onSelect(item.google_maps_url)}
          />
        </li>
      ))}
    </ul>
  );
}

export default RecommendationList;
