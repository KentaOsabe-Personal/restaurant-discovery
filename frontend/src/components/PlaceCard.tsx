import type { Recommendation } from '../types/search';

export type PlaceCardProps = Recommendation;

const PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: '¥',
  PRICE_LEVEL_MODERATE: '¥¥',
  PRICE_LEVEL_EXPENSIVE: '¥¥¥',
  PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥',
};

function formatPriceLevel(priceLevel: string | null): string | null {
  if (priceLevel === null) return null;
  return PRICE_LEVEL_MAP[priceLevel] ?? priceLevel;
}

function PlaceCard({ name, rating, price_level, address, google_maps_url, reason }: PlaceCardProps) {
  const formattedPriceLevel = formatPriceLevel(price_level);
  const safeMapsUrl = google_maps_url.startsWith('https://') ? google_maps_url : '#';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-1">{name}</h3>
      <p className="text-sm text-gray-500 mb-2">{address}</p>
      <p className="text-base mb-3">{reason}</p>
      <div className="flex items-center gap-2 mt-2">
        {rating !== null && <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-2 py-0.5 rounded">{rating}</span>}
        {formattedPriceLevel !== null && <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-0.5 rounded">{formattedPriceLevel}</span>}
      </div>
      <a href={safeMapsUrl} target="_blank" rel="noopener noreferrer" className="block mt-2 text-blue-600 hover:underline text-sm">
        Google Mapsで見る
      </a>
    </div>
  );
}

export default PlaceCard;
