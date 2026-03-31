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
    <div>
      <h3>{name}</h3>
      <p>{address}</p>
      <p>{reason}</p>
      {rating !== null && <span>{rating}</span>}
      {formattedPriceLevel !== null && <span>{formattedPriceLevel}</span>}
      <a href={safeMapsUrl} target="_blank" rel="noopener noreferrer">
        Google Mapsで見る
      </a>
    </div>
  );
}

export default PlaceCard;
