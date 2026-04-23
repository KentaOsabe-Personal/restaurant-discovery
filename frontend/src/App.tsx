import { useState, useMemo, useEffect } from 'react';
import type { Recommendation, OtherCandidate, ParsedConditions, SearchMode, TravelTime } from './types/search';
import { searchPlaces } from './api/search';
import { refinePlaces } from './api/refine';
import SearchInput from './components/SearchInput';
import RecommendationList from './components/RecommendationList';
import OtherCandidateSection from './components/OtherCandidateSection';
import SearchHistoryChips from './components/SearchHistoryChips';
import OmakaseButtons from './components/OmakaseButtons';
import SearchConditionTags from './components/SearchConditionTags';
import FeedbackInput from './components/FeedbackInput';
import MapPanel from './components/MapPanel';
import ModeTabs from './components/ModeTabs';
import DistanceFilterButtons from './components/DistanceFilterButtons';
import RamenOmakaseButton from './components/RamenOmakaseButton';
import { omakaseAreas } from './config/omakaseAreas';
import type { OmakaseAreaId } from './config/omakaseAreas';
import { fetchOmakase } from './api/omakase';
import { useSearchHistory } from './hooks/useSearchHistory';

const IZAKAYA_PLACEHOLDER = '古町の海鮮居酒屋など';
const RAMEN_PLACEHOLDER = '新潟東区のこってり系など';

function App() {
  const [activeTab, setActiveTab] = useState<SearchMode>('izakaya');
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefineLoading, setIsRefineLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [otherCandidates, setOtherCandidates] = useState<OtherCandidate[] | null>(null);
  const [showOtherCandidates, setShowOtherCandidates] = useState<boolean>(false);
  const [parsedConditions, setParsedConditions] = useState<ParsedConditions | null>(null);
  const [refineOrigin, setRefineOrigin] = useState<'ramen_omakase' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoogleMapsUrl, setSelectedGoogleMapsUrl] = useState<string | null>(null);
  const [infoWindowVisible, setInfoWindowVisible] = useState<boolean>(false);
  const [distanceFilter, setDistanceFilter] = useState<TravelTime | null>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory(activeTab);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
    );
  }, []);

  function handleTabChange(mode: SearchMode): void {
    setActiveTab(mode);
    setQuery('');
    setRecommendations(null);
    setOtherCandidates(null);
    setParsedConditions(null);
    setRefineOrigin(null);
    setError(null);
    setShowOtherCandidates(false);
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
    setDistanceFilter(null);
  }

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
    setRefineOrigin(null);
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
    try {
      const travelTime = activeTab === 'ramen' && distanceFilter !== null ? distanceFilter : undefined;
      const response = await searchPlaces(query, activeTab, travelTime);
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
    } catch (e) {
      setError(e instanceof Error ? e.message : '検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRamenOmakase(): Promise<void> {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);
    setOtherCandidates(null);
    setShowOtherCandidates(false);
    setParsedConditions(null);
    setQuery('');
    setRefineOrigin(null);
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
    try {
      const request = distanceFilter === null ? { mode: 'ramen' as const } : { mode: 'ramen' as const, travel_time: distanceFilter };
      const response = await fetchOmakase(request);
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
      setRefineOrigin('ramen_omakase');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'おまかせ取得に失敗しました');
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
    setRefineOrigin(null);
    setSelectedGoogleMapsUrl(null);
    setInfoWindowVisible(false);
    try {
      const response = await fetchOmakase({ area: areaId });
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'おまかせ取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRefine(feedback: string): Promise<void> {
    setIsRefineLoading(true);
    setError(null);
    try {
      const request = refineOrigin === null
        ? {
            feedback,
            original_query: query,
            parsed_conditions: parsedConditions,
            mode: activeTab,
          }
        : {
            feedback,
            original_query: query,
            parsed_conditions: parsedConditions,
            mode: activeTab,
            origin: refineOrigin,
          };
      const response = await refinePlaces({
        ...request,
      });
      setRecommendations(response.recommendations);
      setOtherCandidates(response.other_candidates);
      setParsedConditions(response.parsed_conditions);
      setShowOtherCandidates(false);
      setSelectedGoogleMapsUrl(null);
      setInfoWindowVisible(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : '再レコメンドに失敗しました');
    } finally {
      setIsRefineLoading(false);
    }
  }

  const allCandidates = useMemo(
    () => [...(recommendations ?? []), ...(otherCandidates ?? [])],
    [recommendations, otherCandidates],
  );

  const hasResults = recommendations !== null && recommendations.length > 0;
  const searchPlaceholder = activeTab === 'ramen' ? RAMEN_PLACEHOLDER : IZAKAYA_PLACEHOLDER;

  return (
    <div className={hasResults ? 'flex h-screen overflow-hidden' : 'min-h-screen bg-gray-100'}>
      <div className={hasResults ? 'w-1/2 overflow-y-auto p-4' : 'max-w-3xl mx-auto px-4 py-8'}>
        <h1 className="text-3xl font-bold">Restaurant Discovery</h1>
        <ModeTabs activeTab={activeTab} onTabChange={handleTabChange} />
        <SearchInput value={query} onChange={setQuery} onSubmit={handleSearch} isLoading={isLoading} placeholder={searchPlaceholder} />
        <SearchHistoryChips history={history} onSelect={handleHistorySelect} onRemove={removeFromHistory} onClear={clearHistory} isLoading={isLoading} />
        {activeTab === 'izakaya' && <OmakaseButtons areas={omakaseAreas} onSelect={handleOmakase} isLoading={isLoading} />}
        {activeTab === 'ramen' && (
          <div className="flex flex-wrap gap-2 items-center">
            <DistanceFilterButtons value={distanceFilter} onChange={setDistanceFilter} />
            <RamenOmakaseButton onClick={handleRamenOmakase} isLoading={isLoading} />
          </div>
        )}
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
        {recommendations !== null && recommendations.length > 0 && !isLoading && (
          <FeedbackInput onSubmit={handleRefine} isLoading={isRefineLoading} />
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
            candidates={allCandidates}
            selectedGoogleMapsUrl={selectedGoogleMapsUrl}
            infoWindowVisible={infoWindowVisible}
            onMarkerClick={handleMarkerClick}
            onInfoWindowClose={handleInfoWindowClose}
            userLocation={userLocation}
          />
        </div>
      )}
    </div>
  );
}

export default App;
