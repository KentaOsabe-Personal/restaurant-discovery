import type { Candidate } from '../types/search';

export type PlaceCardProps = Candidate & { reason?: string; isSelected?: boolean; onSelect?: () => void };

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

function buildTabelogSearchUrl(name: string): string | null {
  if (name.trim() === '') return null;
  return `https://tabelog.com/niigata/rstLst/?vs=1&sw=${encodeURIComponent(name.trim())}`;
}

function PlaceCard({ name, rating, price_level, address, google_maps_url, distance_km, reason, isSelected, onSelect }: PlaceCardProps) {
  const formattedPriceLevel = formatPriceLevel(price_level);
  const safeMapsUrl = google_maps_url.startsWith('https://') ? google_maps_url : '#';
  const tabelogUrl = buildTabelogSearchUrl(name);

  return (
    <div
      className={`bg-white rounded-lg shadow p-4${isSelected ? ' ring-2 ring-orange-400' : ''}`}
      onClick={onSelect}
    >
      <h3 className="text-lg font-bold mb-1">{name}</h3>
      <p className="text-sm text-gray-500 mb-2">{address}</p>
      {reason !== undefined && <p className="text-base mb-3">{reason}</p>}
      <div className="flex items-center gap-2 mt-2">
        {rating !== null && <span className="inline-block bg-yellow-100 text-yellow-800 text-sm px-2 py-0.5 rounded">{rating}</span>}
        {formattedPriceLevel !== null && <span className="inline-block bg-green-100 text-green-800 text-sm px-2 py-0.5 rounded">{formattedPriceLevel}</span>}
        {distance_km != null && <span className="inline-block bg-blue-100 text-blue-800 text-sm px-2 py-0.5 rounded">{distance_km.toFixed(1)} km</span>}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        <a href={safeMapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
          Google Mapsで見る
        </a>
        {tabelogUrl && (
          <a href={tabelogUrl} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
            食べログで見る
          </a>
        )}
      </div>
    </div>
  );
}

export default PlaceCard;
