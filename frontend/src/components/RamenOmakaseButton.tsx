export interface RamenOmakaseButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

function RamenOmakaseButton({ onClick, isLoading }: RamenOmakaseButtonProps) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onClick}
      className="min-h-[44px] px-4 py-2 rounded-md border border-red-400 bg-red-50 hover:bg-red-100 text-sm font-medium text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      ラーメンをおまかせ
    </button>
  );
}

export default RamenOmakaseButton;
