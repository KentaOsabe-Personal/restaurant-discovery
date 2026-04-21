export interface SearchInputProps {
  value: string;
  onChange: (query: string) => void;
  onSubmit: (query: string) => void;
  isLoading?: boolean;
  placeholder: string;
}

function SearchInput({ value, onChange, onSubmit, isLoading = false, placeholder }: SearchInputProps) {
  const isSubmitDisabled = value.trim() === '' || isLoading;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitDisabled) return;
    onSubmit(value);
  }

  return (
    <form role="search" onSubmit={handleSubmit} aria-busy={isLoading} className="flex w-full gap-2">
      <input
        type="text"
        placeholder={placeholder}
        aria-label="レストラン検索"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
        className="flex-1 border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        disabled={isSubmitDisabled}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '検索中...' : '探す'}
      </button>
    </form>
  );
}

export default SearchInput;
