import type { Recommendation } from '../types/search';

export type PlaceCardProps = Recommendation;

function formatPriceLevel(priceLevel: string | null): string | null {
  if (priceLevel === null) return null;
  const map: Record<string, string> = {
    PRICE_LEVEL_INEXPENSIVE: '¥',
    PRICE_LEVEL_MODERATE: '¥¥',
    PRICE_LEVEL_EXPENSIVE: '¥¥¥',
    PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥',
  };
  return map[priceLevel] ?? priceLevel;
}

function PlaceCard({ name, rating, price_level, address, google_maps_url, reason }: PlaceCardProps) {
  const formattedPriceLevel = formatPriceLevel(price_level);

  return (
    <div>
      <h3>{name}</h3>
      <p>{address}</p>
      <p>{reason}</p>
      {rating !== null && <span>{rating}</span>}
      {formattedPriceLevel !== null && <span>{formattedPriceLevel}</span>}
      <a href={google_maps_url} target="_blank" rel="noopener noreferrer">
        Google Mapsで見る
      </a>
    </div>
  );
}

export default PlaceCard;
