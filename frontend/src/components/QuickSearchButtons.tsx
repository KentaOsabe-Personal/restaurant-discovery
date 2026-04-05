import type { QuickSearchPreset } from '../config/quickSearchPresets';

export interface QuickSearchButtonsProps {
  presets: readonly QuickSearchPreset[];
  onSelect: (query: string) => void;
  isLoading: boolean;
}

function QuickSearchButtons({ presets, onSelect, isLoading }: QuickSearchButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {presets.map((preset) => (
        <button
          key={preset.label}
          type="button"
          disabled={isLoading}
          onClick={() => onSelect(preset.query)}
          className="min-h-[44px] px-4 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export default QuickSearchButtons;
