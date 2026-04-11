import { render, screen } from '@testing-library/react';
import MapPanel from './MapPanel';

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: any }) => children,
  Map: () => null,
  AdvancedMarker: () => null,
  Pin: () => null,
  InfoWindow: () => null,
  useApiLoadingStatus: () => 'FAILED',
  useMap: () => null,
}));

const defaultProps = {
  candidates: [],
  selectedGoogleMapsUrl: null,
  infoWindowVisible: false,
  onMarkerClick: vi.fn(),
  onInfoWindowClose: vi.fn(),
};

describe('MapPanel', () => {
  describe('Task 6.2 (search-result-map): エラー状態', () => {
    it('useApiLoadingStatus が FAILED を返す場合にエラーメッセージが表示される', () => {
      render(<MapPanel {...defaultProps} />);
      expect(screen.getByText('地図を読み込めませんでした')).toBeInTheDocument();
    });
  });
});
