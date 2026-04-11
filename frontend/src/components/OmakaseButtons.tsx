import type { OmakaseArea, OmakaseAreaId } from '../config/omakaseAreas';

export interface OmakaseButtonsProps {
  areas: readonly OmakaseArea[];
  onSelect: (areaId: OmakaseAreaId) => void;
  isLoading: boolean;
}

function OmakaseButtons({ areas, onSelect, isLoading }: OmakaseButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {areas.map((area) => (
        <button
          key={area.id}
          type="button"
          disabled={isLoading}
          onClick={() => onSelect(area.id)}
          className="min-h-[44px] px-4 py-2 rounded-md border border-orange-400 bg-orange-50 hover:bg-orange-100 text-sm font-medium text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {area.label}
        </button>
      ))}
    </div>
  );
}

export default OmakaseButtons;
