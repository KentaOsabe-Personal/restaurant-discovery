import type { Recommendation } from '../types/search';
import PlaceCard from './PlaceCard';

interface RecommendationListProps {
  recommendations: Recommendation[];
}

function RecommendationList({ recommendations }: RecommendationListProps) {
  return (
    <ul className="list-none p-0 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      {recommendations.map((item) => (
        <li key={item.google_maps_url}>
          <PlaceCard {...item} />
        </li>
      ))}
    </ul>
  );
}

export default RecommendationList;
