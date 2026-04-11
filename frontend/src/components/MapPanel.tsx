import { useEffect } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import type { Candidate } from '../types/search';

const NIIGATA_CENTER = { lat: 37.9026, lng: 139.0232 };

export interface MapPanelProps {
  candidates: Candidate[];
  selectedGoogleMapsUrl: string | null;
  infoWindowVisible: boolean;
  onMarkerClick: (googleMapsUrl: string) => void;
  onInfoWindowClose: () => void;
}

type ValidCandidate = Candidate & { lat: number; lng: number };

// Map内部コンポーネント: useMap()でfitBoundsを制御する
function FitBoundsController({ candidates }: { candidates: Candidate[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const validCandidates = candidates.filter(
      (c): c is ValidCandidate => c.lat !== null && c.lng !== null,
    );
    if (validCandidates.length === 0) return;
    if (validCandidates.length === 1) {
      map.setCenter({ lat: validCandidates[0].lat, lng: validCandidates[0].lng });
      map.setZoom(15);
      return;
    }
    const lats = validCandidates.map(c => c.lat);
    const lngs = validCandidates.map(c => c.lng);
    map.fitBounds({
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    });
  }, [map, candidates]);

  return null;
}

// APIProvider内部コンポーネント: useApiLoadingStatus()を使用し、地図・マーカー・InfoWindowを描画する
function MapPanelContent({
  candidates,
  selectedGoogleMapsUrl,
  infoWindowVisible,
  onMarkerClick,
  onInfoWindowClose,
}: MapPanelProps) {
  const status = useApiLoadingStatus();

  if (status === 'FAILED') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">地図を読み込めませんでした</p>
      </div>
    );
  }

  const validCandidates = candidates.filter(
    (c): c is ValidCandidate => c.lat !== null && c.lng !== null,
  );
  const selectedCandidate =
    validCandidates.find(c => c.google_maps_url === selectedGoogleMapsUrl) ?? null;

  return (
    <Map
      mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID as string}
      style={{ width: '100%', height: '100%' }}
      defaultCenter={NIIGATA_CENTER}
      defaultZoom={12}
    >
      <FitBoundsController candidates={candidates} />
      {validCandidates.map(candidate => (
        <AdvancedMarker
          key={candidate.google_maps_url}
          position={{ lat: candidate.lat, lng: candidate.lng }}
          onClick={() => onMarkerClick(candidate.google_maps_url)}
        >
          <Pin
            background={
              candidate.google_maps_url === selectedGoogleMapsUrl ? '#FF6B35' : undefined
            }
          />
        </AdvancedMarker>
      ))}
      {infoWindowVisible && selectedCandidate !== null && (
        <InfoWindow
          position={{ lat: selectedCandidate.lat, lng: selectedCandidate.lng }}
          onCloseClick={onInfoWindowClose}
        >
          <div>
            <p className="font-bold">{selectedCandidate.name}</p>
            {selectedCandidate.rating !== null && <p>評価: {selectedCandidate.rating}</p>}
            <p>{selectedCandidate.address}</p>
          </div>
        </InfoWindow>
      )}
    </Map>
  );
}

// 外側コンポーネント: APIProviderで囲む薄いラッパー
function MapPanel(props: MapPanelProps) {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string}>
      <MapPanelContent {...props} />
    </APIProvider>
  );
}

export default MapPanel;
