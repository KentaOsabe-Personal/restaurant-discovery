import { useState } from 'react';
import type { Recommendation, OtherCandidate, ParsedConditions } from './types/search';
import { searchPlaces } from './api/search';
import SearchInput from './components/SearchInput';
import RecommendationList from './components/RecommendationList';
import OtherCandidateSection from './components/OtherCandidateSection';
import SearchHistoryChips from './components/SearchHistoryChips';
import OmakaseButtons from './components/OmakaseButtons';
import SearchConditionTags from './components/SearchConditionTags';
import MapPanel from './components/MapPanel';
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
  const [selectedGoogleMapsUrl, setSelectedGoogleMapsUrl] = useState<string | null>(null);
  const [infoWindowVisible, setInfoWindowVisible] = useState<boolean>(false);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  const effectiveOtherExpanded =
    showOtherCandidates ||
    Boolean(otherCandidates?.some((c) => c.google_maps_url === selectedGoogleMapsUrl));

  function handleListSelect(googleMapsUrl: string): void {
    setSelectedGoogleMapsUrl(googleMapsUrl);
    setInfoWindowVisible(false);
  }

  function handleMarkerClick(googleMapsUrl: string): void {
    setSelectedGoogleMapsUrl(googleMapsUrl);
    setInfoWindowVisible(true);
  }

  function handleInfoWindowClose(): void {
    setInfoWindowVisible(false);
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
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
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
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
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

  const hasResults = recommendations !== null && recommendations.length > 0;

  return (
    <div className={hasResults ? 'flex h-screen overflow-hidden' : 'min-h-screen bg-gray-100'}>
      <div className={hasResults ? 'w-1/2 overflow-y-auto p-4' : 'max-w-3xl mx-auto px-4 py-8'}>
        <h1 className="text-3xl font-bold">Restaurant Discovery</h1>
        <SearchInput value={query} onChange={setQuery} onSubmit={handleSearch} isLoading={isLoading} />
        <SearchHistoryChips history={history} onSelect={handleHistorySelect} onRemove={removeFromHistory} onClear={clearHistory} isLoading={isLoading} />
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
          <RecommendationList
            recommendations={recommendations}
            selectedGoogleMapsUrl={selectedGoogleMapsUrl}
            onSelect={handleListSelect}
          />
        )}
        {otherCandidates !== null && (
          <OtherCandidateSection
            candidates={otherCandidates}
            isExpanded={effectiveOtherExpanded}
            onExpandChange={setShowOtherCandidates}
            isSearchLoading={isLoading}
            selectedGoogleMapsUrl={selectedGoogleMapsUrl}
            onSelect={handleListSelect}
          />
        )}
      </div>
      {hasResults && (
        <div className="w-1/2 h-full">
          <MapPanel
            candidates={[...recommendations, ...(otherCandidates ?? [])]}
            selectedGoogleMapsUrl={selectedGoogleMapsUrl}
            infoWindowVisible={infoWindowVisible}
            onMarkerClick={handleMarkerClick}
            onInfoWindowClose={handleInfoWindowClose}
          />
        </div>
      )}
    </div>
  );
}

export default App;
