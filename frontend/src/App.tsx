import { useState } from 'react';
import type { Recommendation, OtherCandidate, ParsedConditions } from './types/search';
import { searchPlaces } from './api/search';
import SearchInput from './components/SearchInput';
import RecommendationList from './components/RecommendationList';
import OtherCandidateSection from './components/OtherCandidateSection';
import QuickSearchButtons from './components/QuickSearchButtons';
import SearchHistoryChips from './components/SearchHistoryChips';
import OmakaseButtons from './components/OmakaseButtons';
import SearchConditionTags from './components/SearchConditionTags';
import { quickSearchPresets } from './config/quickSearchPresets';
import { omakaseAreas } from './config/omakaseAreas';
import type { OmakaseAreaId } from './config/omakaseAreas';
import { fetchOmakase } from './api/omakase';
import { useSearchHistory } from './hooks/useSearchHistory';

function App() {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [otherCandidates, setOtherCandidates] = useState<OtherCandidate[] | null>(null);
  const [showOtherCandidates, setShowOtherCandidates] = useState<boolean>(false);
  const [parsedConditions, setParsedConditions] = useState<ParsedConditions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  function handleQuickSearch(presetQuery: string): void {
    setQuery(presetQuery);
    void handleSearch(presetQuery);
  }

  function handleHistorySelect(historyQuery: string): void {
    setQuery(historyQuery);
    void handleSearch(historyQuery);
  }

  async function handleSearch(query: string): Promise<void> {
    addToHistory(query);
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setOtherCandidates(null);
    setShowOtherCandidates(false);
    setParsedConditions(null);
    try {
      const response = await searchPlaces(query);
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOmakase(areaId: OmakaseAreaId): Promise<void> {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setOtherCandidates(null);
    setShowOtherCandidates(false);
    setParsedConditions(null);
    setQuery('');
    try {
      const response = await fetchOmakase(areaId);
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'おまかせ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Restaurant Discovery</h1>
        <SearchInput value={query} onChange={setQuery} onSubmit={handleSearch} isLoading={isLoading} />
        <SearchHistoryChips history={history} onSelect={handleHistorySelect} onRemove={removeFromHistory} onClear={clearHistory} isLoading={isLoading} />
        <QuickSearchButtons presets={quickSearchPresets} onSelect={handleQuickSearch} isLoading={isLoading} />
        <OmakaseButtons areas={omakaseAreas} onSelect={handleOmakase} isLoading={isLoading} />
        {!isLoading && parsedConditions !== null && <SearchConditionTags parsedConditions={parsedConditions} />}
        {isLoading && <p className="text-gray-500 italic">読み込み中...</p>}
        {error !== null && !isLoading && <p className="text-red-600">{error}</p>}
        {recommendations !== null && recommendations.length === 0 && (otherCandidates === null || otherCandidates.length === 0) && !isLoading && error === null && (
          <p className="text-center text-gray-400">条件に合うレストランが見つかりませんでした</p>
        )}
        {recommendations !== null && recommendations.length === 0 && otherCandidates !== null && otherCandidates.length > 0 && !isLoading && error === null && (
          <p className="text-center text-gray-400">AIのおすすめは見つかりませんでしたが、その他の候補があります</p>
        )}
        {recommendations !== null && recommendations.length > 0 && !isLoading && (
          <RecommendationList recommendations={recommendations} />
        )}
        {otherCandidates !== null && (
          <OtherCandidateSection
            candidates={otherCandidates}
            isExpanded={showOtherCandidates}
            onExpand={() => setShowOtherCandidates(true)}
            isSearchLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default App;
