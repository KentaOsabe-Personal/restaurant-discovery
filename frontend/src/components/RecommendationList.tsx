import type { Recommendation } from '../types/search';
import PlaceCard from './PlaceCard';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

function RecommendationList({ recommendations }: RecommendationListProps) {
  return (
    <ul>
      {recommendations.map((item) => (
        <li key={item.google_maps_url}>
          <PlaceCard {...item} />
        </li>
      ))}
    </ul>
  );
}

export default RecommendationList;
