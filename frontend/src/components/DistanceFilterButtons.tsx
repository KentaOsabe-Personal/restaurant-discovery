import type { TravelTime } from '../types/search';

interface DistanceFilterButtonsProps {
  value: TravelTime | null;
  onChange: (value: TravelTime | null) => void;
}

const BUTTONS = [
  { label: '30分以内', value: 'within_30min' as TravelTime },
  { label: '1時間以内', value: 'within_1hour' as TravelTime },
  { label: '1時間以上2時間以内', value: '1_to_2_hours' as TravelTime },
  { label: '距離指定なし', value: null },
] as const;

function DistanceFilterButtons({ value, onChange }: DistanceFilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {BUTTONS.map((button) => {
        const isSelected = value === button.value;
        return (
          <button
            key={button.label}
            type="button"
            onClick={() => onChange(button.value)}
            className={
              isSelected
                ? 'min-h-[44px] px-4 py-2 rounded-md text-sm font-medium bg-orange-500 text-white'
                : 'min-h-[44px] px-4 py-2 rounded-md border border-orange-400 bg-white text-orange-700 hover:bg-orange-50'
            }
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}

export default DistanceFilterButtons;
