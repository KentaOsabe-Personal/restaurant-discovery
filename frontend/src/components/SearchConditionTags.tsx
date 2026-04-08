import type { ParsedConditions } from '../types/search';

interface SearchConditionTagsProps {
  parsedConditions: ParsedConditions;
}

const PRICE_LEVEL_LABELS: Partial<Record<string, string>> = {
  PRICE_LEVEL_FREE: '無料',
  PRICE_LEVEL_INEXPENSIVE: 'リーズナブル',
  PRICE_LEVEL_MODERATE: '普通',
  PRICE_LEVEL_EXPENSIVE: '高め',
  PRICE_LEVEL_VERY_EXPENSIVE: '超高級',
};

function SearchConditionTags({ parsedConditions }: SearchConditionTagsProps) {
  const { area, genre, price_level, keyword } = parsedConditions;

  if (area === null && genre === null && price_level === null && keyword === null) {
    return null;
  }

  const tags: { label: string; value: string }[] = [];

  if (area !== null) tags.push({ label: 'エリア', value: area });
  if (genre !== null) tags.push({ label: 'ジャンル', value: genre });
  if (price_level !== null) tags.push({ label: '価格帯', value: PRICE_LEVEL_LABELS[price_level] ?? price_level });
  if (keyword !== null) tags.push({ label: 'キーワード', value: keyword });

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map(({ label, value }) => (
        <span key={label} className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm">
          {label}: {value}
        </span>
      ))}
    </div>
  );
}

export default SearchConditionTags;
