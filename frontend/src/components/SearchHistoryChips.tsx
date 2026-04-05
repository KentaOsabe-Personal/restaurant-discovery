import type { SearchHistoryEntry } from '../types/search';

interface SearchHistoryChipsProps {
  history: readonly SearchHistoryEntry[];
  onSelect: (query: string) => void;
  onRemove: (query: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

function SearchHistoryChips({ history, onSelect, onRemove, onClear, isLoading }: SearchHistoryChipsProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {history.map((entry) => (
        <div key={entry.query} className="flex items-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect(entry.query)}
            className="min-h-[36px] px-3 py-1 rounded-l-full border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {entry.query}
          </button>
          <button
            type="button"
            aria-label={`× ${entry.query}`}
            disabled={isLoading}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(entry.query);
            }}
            className="min-h-[36px] px-2 py-1 rounded-r-full border border-l-0 border-gray-300 bg-white hover:bg-gray-100 text-sm text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={isLoading}
        onClick={onClear}
        className="min-h-[36px] px-3 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        履歴クリア
      </button>
    </div>
  );
}

export default SearchHistoryChips;
