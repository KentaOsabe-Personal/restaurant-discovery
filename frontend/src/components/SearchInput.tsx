import { useState } from 'react';

export interface SearchInputProps {
  onSubmit: (query: string) => void;
  isLoading?: boolean;
}

function SearchInput({ onSubmit, isLoading = false }: SearchInputProps) {
  const [query, setQuery] = useState<string>('');
  const isSubmitDisabled = query.trim() === '' || isLoading;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitDisabled) return;
    onSubmit(query);
  }

  return (
    <form role="search" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="渋谷でイタリアンなど"
        aria-label="レストラン検索"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isSubmitDisabled} aria-busy={isLoading}>
        {isLoading ? '検索中...' : '探す'}
      </button>
    </form>
  );
}

export default SearchInput;
