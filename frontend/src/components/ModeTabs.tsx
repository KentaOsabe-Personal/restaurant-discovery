import type { SearchMode } from '../types/search';

type ModeTabsProps = {
  activeTab: SearchMode;
  onTabChange: (mode: SearchMode) => void;
};

const TABS: { mode: SearchMode; label: string }[] = [
  { mode: 'izakaya', label: '居酒屋・バー' },
  { mode: 'ramen', label: 'ラーメン' },
];

export default function ModeTabs({ activeTab, onTabChange }: ModeTabsProps) {
  return (
    <div role="tablist" className="flex border-b border-gray-200">
      {TABS.map(({ mode, label }) => {
        const isActive = activeTab === mode;
        return (
          <button
            key={mode}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(mode)}
            className={
              isActive
                ? 'px-4 py-2 text-sm font-semibold border-b-2 border-blue-500 text-blue-600'
                : 'px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700'
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
