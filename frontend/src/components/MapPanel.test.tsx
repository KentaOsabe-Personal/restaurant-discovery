import { render, screen } from '@testing-library/react';
import type { Candidate } from '../types/search';
import MapPanel from './MapPanel';

const mockUseApiLoadingStatus = vi.fn<() => string>();

vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: { children: any }) => children,
  Map: ({ children }: { children: any }) => <>{children}</>,
  AdvancedMarker: ({ children }: { children?: any }) => <>{children}</>,
  Pin: ({ background }: { background?: string }) => (
    <div data-testid="pin" data-background={background ?? ''} />
  ),
  InfoWindow: () => null,
  useApiLoadingStatus: () => mockUseApiLoadingStatus(),
  useMap: () => null,
}));

const defaultProps = {
  candidates: [] as Candidate[],
  selectedGoogleMapsUrl: null,
  infoWindowVisible: false,
  onMarkerClick: vi.fn(),
  onInfoWindowClose: vi.fn(),
};

describe('MapPanel', () => {
  describe('Task 6.2 (search-result-map): エラー状態', () => {
    it('useApiLoadingStatus が FAILED を返す場合にエラーメッセージが表示される', () => {
      mockUseApiLoadingStatus.mockReturnValue('FAILED');
      render(<MapPanel {...defaultProps} />);
      expect(screen.getByText('地図を読み込めませんでした')).toBeInTheDocument();
    });
  });

  describe('現在地ピン', () => {
    beforeEach(() => {
      mockUseApiLoadingStatus.mockReturnValue('LOADED');
    });

    it('userLocation が指定された場合、青いピン（#4285F4）が表示される', () => {
      render(<MapPanel {...defaultProps} userLocation={{ lat: 37.9, lng: 139.0 }} />);
      const pins = screen.getAllByTestId('pin');
      expect(pins.some((p) => p.dataset.background === '#4285F4')).toBe(true);
    });

    it('userLocation が null の場合、青いピンは表示されない', () => {
      render(<MapPanel {...defaultProps} userLocation={null} />);
      const pins = screen.queryAllByTestId('pin');
      expect(pins.some((p) => p.dataset.background === '#4285F4')).toBe(false);
    });

    it('userLocation が未指定の場合、青いピンは表示されない', () => {
      render(<MapPanel {...defaultProps} />);
      const pins = screen.queryAllByTestId('pin');
      expect(pins.some((p) => p.dataset.background === '#4285F4')).toBe(false);
    });
  });
});
