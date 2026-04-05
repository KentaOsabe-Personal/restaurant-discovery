import type { OmakasePreset } from '../config/omakasePresets';

export interface OmakaseButtonProps {
  presets: readonly OmakasePreset[];
  onSelect: (query: string) => void;
  isLoading: boolean;
}

function OmakaseButton({ presets, onSelect, isLoading }: OmakaseButtonProps) {
  const isDisabled = isLoading || presets.length === 0;

  function handleClick(): void {
    const index = Math.floor(Math.random() * presets.length);
    onSelect(presets[index]);
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      className="min-h-[44px] px-4 py-2 rounded-md border border-orange-400 bg-orange-50 hover:bg-orange-100 text-sm font-medium text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      おまかせ
    </button>
  );
}

export default OmakaseButton;
