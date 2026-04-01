import { useState } from 'react';
import type { Recommendation } from './types/search';
import { searchPlaces } from './api/search';
import SearchInput from './components/SearchInput';
import RecommendationList from './components/RecommendationList';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(query: string): Promise<void> {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    try {
      const response = await searchPlaces(query);
      setRecommendations(response.recommendations);
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <h1>Restaurant Discovery</h1>
      <SearchInput onSubmit={handleSearch} isLoading={isLoading} />
      {isLoading && <p>読み込み中...</p>}
      {error !== null && !isLoading && <p>{error}</p>}
      {recommendations !== null && recommendations.length === 0 && !isLoading && error === null && (
        <p>条件に合うレストランが見つかりませんでした</p>
      )}
      {recommendations !== null && recommendations.length > 0 && !isLoading && (
        <RecommendationList recommendations={recommendations} />
      )}
    </div>
  );
}

export default App;
